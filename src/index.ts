import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import {
  PluggableElementType,
  WidgetType,
} from '@jbrowse/core/pluggableElementTypes'
import {
  SessionWithWidgets,
  getSession,
  isAbstractMenuManager,
  isSessionModelWithWidgets,
} from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// icons
import BookmarksIcon from '@mui/icons-material/Bookmarks'

// Locals
import { version } from '../package.json'
import {
  ReactComponent as CustomBookmarkWidget,
  stateModel,
} from './CustomBookmarkWidget'
export default class BookmarksPlusPlugin extends Plugin {
  name = 'BookmarksPlusPlugin'
  version = version

  install(pluginManager: PluginManager) {
    pluginManager.addToExtensionPoint(
      'Core-extendPluggableElement',
      (pluggableElement: PluggableElementType) => {
        if (pluggableElement.name === 'LinearGenomeView') {
          const { stateModel } = pluggableElement as ViewType
          // TODO: separate this out
          const newStateModel = stateModel.extend(
            (self: LinearGenomeViewModel) => {
              return {
                actions: {
                  afterCreate() {
                    document.addEventListener('keydown', (e) => {
                      // ctrl+d or cmd+d
                      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
                        e.preventDefault()
                        // @ts-ignore
                        self.bookmarkCurrentRegion()
                        getSession(self).notify('Bookmark created.', 'success')
                      }
                      // ctrl+m or cmd+m
                      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyM') {
                        e.preventDefault()
                        this.navigateNewestBookmark()
                      }
                    })
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
                      const regions = bookmarkWidget.bookmarkedRegions
                      if (regions.length !== 0) {
                        self.navTo(regions[regions.length - 1])
                        session.notify(
                          'Navigated to the most recently created bookmark.',
                          'success',
                        )
                      } else {
                        session.notify(
                          'There are no recent bookmarks to navigate to.',
                          'info',
                        )
                      }
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

    pluginManager.addToExtensionPoint(
      'Core-replaceWidget',
      (DefaultComponent, { model }) => {
        // @ts-ignore
        return model.type === 'GridBookmarkWidget'
          ? CustomBookmarkWidget
          : DefaultComponent
      },
    )
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Tools', {
        label: 'Bookmarks',
        icon: BookmarksIcon,
        onClick: (session: SessionWithWidgets) => {
          let bookmarkWidget = session.widgets.get('GridBookmark')
          if (!bookmarkWidget) {
            bookmarkWidget = session.addWidget(
              'GridBookmarkWidget',
              'GridBookmark',
            )
          }
          session.showWidget(bookmarkWidget)
        },
      })
    }
  }
}
