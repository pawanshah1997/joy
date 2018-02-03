/**
 * Created by bedeho on 31/05/17.
 */

// Scene which may be active at any given time
var Scene = {
  Downloading: 0, // before the core application has started
  Uploading: 1,
  Completed: 2,
  Community: 3
}

module.exports = Scene
