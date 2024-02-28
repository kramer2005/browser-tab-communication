import { TabsManager } from '../src/index'

let manager
const isEditor = window.location.hash === '#editor'
const textParent = isEditor ? document.body : document.createElement('div')
let tabEditor

const editors = []

interface MessageData {
  type: string
  data: any
}

const createTextArea = (tab) => {
  if (isEditor) {
    const tabEditor = document.createElement('textarea')
    tabEditor.placeholder = 'Type here...'
    textParent.appendChild(tabEditor)

    return tabEditor
  }

  const editorDiv = document.createElement('div')
  textParent.appendChild(editorDiv)

  const tabEditorLabel = document.createElement('label')
  tabEditorLabel.innerHTML = `Tab ${tab?.id || 'me'}`
  editorDiv.appendChild(tabEditorLabel)

  const tabEditor = document.createElement('textarea')
  tabEditor.placeholder = 'Type here...'
  editorDiv.appendChild(tabEditor)

  tabEditor.oninput = () => {
    tab.send(
      JSON.stringify({
        type: 'data',
        data: tabEditor.value,
      }),
    )
  }

  editors[tab.id] = editorDiv

  return tabEditor
}

TabsManager.onTabOpen = (tab) => {
  if (!isEditor) {
    tabEditor = createTextArea(tab)
  }

  tab.onmessage = (event: MessageEvent) => {
    const data: MessageData = JSON.parse(event.data)

    if (data.type === 'manager') {
      manager = tab

      tabEditor.oninput = () => {
        tab.send(
          JSON.stringify({
            type: 'data',
            data: tabEditor.value,
          }),
        )
      }
    }

    if (data.type === 'data') {
      tabEditor.value = data.data
    }
  }

  if (!isEditor) {
    tab.send(
      JSON.stringify({
        type: 'manager',
        data: 'I am the manager',
      }),
    )
  }
}

TabsManager.onTabClose = (tab) => {
  if (!isEditor) {
    editors[tab.id].remove()
  }
}

const setup = () => {
  if (isEditor) {
    tabEditor = createTextArea(manager)
  } else {
    const newTabButton = document.createElement('a')
    newTabButton.innerHTML = '+'
    newTabButton.href = '#editor'
    newTabButton.target = '_blank'

    document.body.appendChild(newTabButton)
    textParent.classList.add('editors')

    document.body.appendChild(textParent)
  }
}

window.onload = setup
