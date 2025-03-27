import React from 'react'

export default function Footer() {
  return (
    <div className="main-footer text-center">
      <div className="container">
        <div className="row row-sm">
          <div className="col-md-12" > <span style={{"fontSize" : "15px"}}>© {new Date().getFullYear()} $LockChain All Rights Reserved</span> </div>
        </div>
      </div>
    </div>
  )
}
