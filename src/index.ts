import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import { PluggableElementType } from '@jbrowse/core/pluggableElementTypes'
import { getSession, isSessionModelWithWidgets } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// Locals
import { version } from '../package.json'

export default class BookmarksPlusPlugin extends Plugin {
  name = 'BookmarksPlusPlugin'
  version = version

  install(pluginManager: PluginManager) {
    pluginManager.addToExtensionPoint(
      'Core-extendPluggableElement',
      (pluggableElement: PluggableElementType) => {
        if (pluggableElement.name === 'LinearGenomeView') {
          const { stateModel } = pluggableElement as ViewType
          const newStateModel = stateModel.extend(
            (self: LinearGenomeViewModel) => {
              return {
                actions: {
                  afterCreate() {
                    document.addEventListener('keydown', (e) => {
                      // ctrl+d or cmd+d
                      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
                        e.preventDefault()
                        this.bookmarkVisibleRegion()
                      }
                      // ctrl+n or cmd+n
                      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyM') {
                        e.preventDefault()
                        this.navigateNewestBookmark()
                      }
                    })
                  },
                  bookmarkVisibleRegion() {
                    const selectedRegions = self.getSelectedRegions(
                      self.leftOffset,
                      self.rightOffset,
                    )
                    const firstRegion = selectedRegions[0]
                    const session = getSession(self)
                    if (isSessionModelWithWidgets(session)) {
                      const { widgets } = session
                      let bookmarkWidget = widgets.get('GridBookmark')
                      if (!bookmarkWidget) {
                        // @ts-ignore
                        self.activateBookmarkWidget()
                        bookmarkWidget = widgets.get('GridBookmark')
                      }
                      // @ts-expect-error
                      bookmarkWidget.addBookmark(firstRegion)
                    }
                  },
                  navigateNewestBookmark() {
                    const session = getSession(self)
                    if (isSessionModelWithWidgets(session)) {
                      const { widgets } = session
                      let bookmarkWidget = widgets.get('GridBookmark')
                      if (!bookmarkWidget) {
                        // @ts-ignore
                        self.activateBookmarkWidget()
                        bookmarkWidget = widgets.get('GridBookmark')
                      }
                      // @ts-expect-error
                      self.navTo(bookmarkWidget.bookmarkedRegions[0])
                    }
                  },
                },
                views: {},
              }
            },
          )

          ;(pluggableElement as ViewType).stateModel = newStateModel
        }
        return pluggableElement
      },
    )
  }

  configure(pluginManager: PluginManager) {}
}
