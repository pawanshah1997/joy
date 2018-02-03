import React, { Component } from 'react'
import TorrentRow from './TorrentRow'
import PropTypes from 'prop-types'

class TorrentRows extends Component {
  render () {
    return (
      <div className="content">
        {this.props.torrents.map((torrent, i) => {
          let backgroundColor = (i % 2 === 0) ? 'hsla(0, 0%, 93%, 1)' : 'white'

          return (
            <TorrentRow
              key={torrent.infoHash}
              torrent={torrent}
              store={this.props.store}
              backgroundColor={backgroundColor} />)
        })}
      </div>
    )
  }
}

TorrentRows.propTypes = {
  torrents: PropTypes.array.isRequired, // Further refine this to require particular object (shapes) in array?
  store: PropTypes.object.isRequired
}

export default TorrentRows
