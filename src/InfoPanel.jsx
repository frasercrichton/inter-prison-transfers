import React from 'react'
import './InfoPanel.css'

const InfoPanel = () => {
  return (
    <div className='info-panel'>
      <div className='info-panel-heading'>Interprison Transfers</div>
      <p>
        Transfers between prisons highlighting Population Management transfers.
      </p>
      <p>
        Datasource: <a href="https://fyi.org.nz/request/16105/response/61829/attach/html/13/C138852%20Appendix%20One.xlsx.html">National Prison Transfer List 2nd July 2018 -
        22nd July 2021</a>
      </p>
      <div className="metrics-layout">
        <div className="info-panel-metrics">
          No. Transfers:
          <div className="info-panel-metrics">
            <strong>27 786</strong>
          </div>
        </div>
        <div className="info-panel-metrics">
          Population Management Transfers:
          <div className="info-panel-metrics">
            <strong>8 835</strong>
          </div>
        </div>
      </div>
    </div>)
}

export default InfoPanel