import './App.css'
import React from 'react'
import DeckGL from '@deck.gl/react'
import { ArcLayer } from '@deck.gl/layers'
import { GridLayer } from '@deck.gl/aggregation-layers'
import { StaticMap } from 'react-map-gl'
import data from './data/transfers.json'

const MAP_BOX_ACCESS_TOKEN = process.env.REACT_APP_MAP_LEAFLET_KEY
const BLUE_RGB = [0, 0, 255, 40]
const RED_RGB = [240, 100, 0, 40]
const url = 'https://s3.amazonaws.com/frasercrichton.com/inter-prison-transfers/transfers.json'
const viewState = {
  longitude: 174.1886324,
  latitude: -40.6509396,
  bearing: 0,
  pitch: 45,
  zoom: 4.8
}

// // auto_highlight: true
// "From: {From} To: {To} Reason: {Reason} Transfer Date: {Transfer Date} Status At Transfer: {Status At Transfer} <br /> From in red; To in blue"
function App () {
  return (
    <DeckGL
      controller
      initialViewState={viewState}
    >
      <ArcLayer
        id='arcs'
        data={data}
        getSourcePosition={d => d.Transfer_From_Coordinates}
        getTargetPosition={d => d.Transfer_To_Coordinates}
        getSourceColor={RED_RGB}
        getTargetColor={BLUE_RGB}
        getWidth={3}
        getTilt={80}
      />
      <GridLayer
        id='grid-layer'
        data={data}
        packable
        extruded
        cellSize={20000}
        elevationScale={400}
        getPosition={d => d.Transfer_From_Coordinates}
        colorRange={[RED_RGB]}
      />

      <StaticMap mapboxApiAccessToken={MAP_BOX_ACCESS_TOKEN} />
    </DeckGL>
  )
}

export default App
