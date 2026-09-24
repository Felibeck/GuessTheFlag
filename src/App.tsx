import React, { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import GameProvider from './Context/GameProvider'
import { getAllFlags } from './services/flagApi'

function App() {
  
    const [flagList, setFlagList] = useState()
    const [selectedFlag, setSelectedFlag] = useState()
    const [score, setScore] = useState(0)
    

    useEffect(() =>
    {

      const flags = await getAllFlags()

      setFlagList(flagList => flagList = flags);
      

      
    })





  return (
    <>
      <GameProvider>



      </GameProvider>
    </>
  )
}

export default App
