/**
 * Created by bedeho on 05/05/17.
 */

import React from 'react'
import PropTypes from 'prop-types';

import Field from "./Field"

function to_header_elements(titles) {

    return titles.map((title) => {
        return <Field key={title}> {title} </Field>
    })
}

const Table = (props) => {

    return (
        <div className="my_table">
            <div className="column-headers"> {to_header_elements(props.column_titles)} </div>
            <div className="content osx_scrollbar">
              {props.children}
            </div>
        </div>
    )

}

Table.propTypes = {
    column_titles : PropTypes.array.isRequired
}

export default Table
