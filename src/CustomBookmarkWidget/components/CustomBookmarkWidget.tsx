import React, { LazyExoticComponent } from 'react'

import { observer } from 'mobx-react'
import { getEnv, getSession } from '@jbrowse/core/util'
import { WidgetType } from '@jbrowse/core/pluggableElementTypes'
import { Alert, Button, Card, Typography } from '@mui/material'

// locals
import ExportBookmarks from './ExportBookmarks'
import ImportBookmarks from './ImportBookmarks'
import ClearBookmarks from './DeleteBookmarks'
import BookmarkGrid from './BookmarkGrid'

function CustomBookmarkWidget({ model }: { model: any }) {
  if (!model) return null
  return (
    <Card
      style={{
        display: 'flex',
        flexFlow: 'column',
        margin: '5px',
        padding: '5px',
        gap: '5px',
      }}
    >
      <div>
        <ExportBookmarks model={model} />
        <ImportBookmarks model={model} />
        <ClearBookmarks model={model} />
      </div>
      <Alert severity="info">
        Click or double click the <strong>label</strong> field to notate your
        bookmark.
      </Alert>
      <BookmarkGrid model={model} />
    </Card>
  )
}

export default observer(CustomBookmarkWidget)
