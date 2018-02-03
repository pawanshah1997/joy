
function createTemplate (win) {
  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Preferences',
          click () { win.webContents.send('openPreferences') }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {role: 'toggledevtools'}
      ]
    },
    {
      role: 'window',
      submenu: [
        {role: 'minimize'},
        {role: 'close'}
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click () { require('electron').shell.openExternal('http://joystream.co/') }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Joystream',
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    })

    // Edit menu
    template[1].submenu.push(
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'}
        ]
      }
    )

    // Window menu
    template[3].submenu = [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'}
    ]
  }

  return template
}

export { createTemplate }
