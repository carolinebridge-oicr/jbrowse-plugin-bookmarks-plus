import React, { useState } from 'react'
import { observer } from 'mobx-react'
import { getSession } from '@jbrowse/core/util'
import AssemblySelector from '@jbrowse/core/ui/AssemblySelector'
import { FileLocation } from '@jbrowse/core/util/types'
import { FileSelector } from '@jbrowse/core/ui'
import { openLocation } from '@jbrowse/core/util/io'
import {
  Button,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
} from '@mui/material'
import { Dialog } from '@jbrowse/core/ui'
import { makeStyles } from 'tss-react/mui'

import PluginLoader, {
  PluginDefinition,
  PluginRecord,
} from '@jbrowse/core/PluginLoader'

import { addRelativeUris, checkPlugins, fromUrlSafeB64, readConf } from './util'
import shortid from 'shortid'

// icons
import ImportIcon from '@mui/icons-material/Publish'

// locals
import { GridBookmarkModel } from '../model'

const useStyles = makeStyles()(() => ({
  dialogContainer: {
    margin: 15,
  },
  flexItem: {
    margin: 5,
  },
}))

const handleLocation = async (location: FileLocation, selectedAsm: string) => {
  const data = await openLocation(location).readFile('utf8')
  const regions = data
    .split(/\n|\r\n|\r/)
    .filter((f) => !!f.trim())
    .filter(
      (f) =>
        !f.startsWith('#') &&
        !f.startsWith('track') &&
        !f.startsWith('browser'),
    )
    .map((line) => {
      const [refName, start, end, name] = line.split('\t')
      return {
        assemblyName: selectedAsm,
        refName,
        start: +start,
        end: +end,
        label: name === '.' ? undefined : name,
      }
    })

  return regions
}

const handleShareLink = async (shareLink: string, selectedAsm: string) => {
  function getErrorMsg(err: string) {
    try {
      const obj = JSON.parse(err)
      return obj.message
    } catch (e) {
      return err
    }
  }

  async function fetchSharedSession() {
    const defaultUrl = 'https://share.jbrowse.org/api/v1/'
    const query = shareLink.split('&session')[1].split('&password')[0]
    const password = shareLink.split('&password=')[1]

    const decryptedSession = await readSessionFromDynamo(
      `${defaultUrl}load`,
      query,
      password,
    )

    return JSON.parse(await fromUrlSafeB64(decryptedSession))
  }

  async function readSessionFromDynamo(
    baseUrl: string,
    sessionQueryParam: string,
    password: string,
    signal?: AbortSignal,
  ) {
    const sessionId = sessionQueryParam.split('share-')[1]
    const url = `${baseUrl}?sessionId=${encodeURIComponent(sessionId)}`
    const response = await fetch(url, {
      signal,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(getErrorMsg(err))
    }

    const json = await response.json()
    return decrypt(json.session, password)
  }

  const decrypt = async (text: string, password: string) => {
    const AES = await import('crypto-js/aes')
    const Utf8 = await import('crypto-js/enc-utf8')
    const bytes = AES.decrypt(text, password)
    return bytes.toString(Utf8)
  }

  const session = await fetchSharedSession()

  const bookmarks = session?.widgets['GridBookmark'].bookmarkedRegions

  return bookmarks
}

function ImportBookmarks({ model }: { model: GridBookmarkModel }) {
  const { classes } = useStyles()
  const session = getSession(model)
  const { assemblyNames } = session
  const [dialogOpen, setDialogOpen] = useState(false)
  const [location, setLocation] = useState<FileLocation>()
  const [error, setError] = useState<unknown>()
  // TODO: assemblies
  const [selectedAsm, setSelectedAsm] = useState(assemblyNames[0])
  const [shareLink, setShareLink] = useState('')

  // TODO: possible UI here; accordion options?
  return (
    <>
      <Button startIcon={<ImportIcon />} onClick={() => setDialogOpen(true)}>
        Import
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        title="Import bookmarks"
      >
        <DialogContent>
          <Typography variant="subtitle1">
            <strong>Import from share link:</strong>
          </Typography>
          <TextField
            label="Enter URL"
            variant="outlined"
            style={{ width: '100%' }}
            value={shareLink}
            onChange={(e) => {
              setShareLink(e.target.value)
            }}
          />
          <Typography variant="subtitle1">
            <strong>Import from file:</strong>
          </Typography>
          <FileSelector
            location={location}
            setLocation={setLocation}
            name="File"
            description="Choose a BED or TSV format file to import. The first 4 columns will be used."
          />
          {error ? (
            <Typography color="error" variant="h6">{`${error}`}</Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className={classes.flexItem}
            data-testid="dialogImport"
            variant="contained"
            color="primary"
            disabled={!location && !shareLink}
            startIcon={<ImportIcon />}
            onClick={async () => {
              // clear field
              try {
                if (!location && !shareLink) {
                  return
                }
                if (location) {
                  const regions = await handleLocation(location, selectedAsm)
                  model.importBookmarks(regions)
                }
                if (shareLink) {
                  const regions = await handleShareLink(shareLink, selectedAsm)
                  model.importBookmarks(regions)
                }
                setDialogOpen(false)
              } catch (e) {
                console.error(e)
                setError(e)
              }
            }}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default observer(ImportBookmarks)
