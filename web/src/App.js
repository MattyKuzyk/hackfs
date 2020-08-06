import React, { useEffect, useState } from 'react';
import { connect, getAddress, getBalance } from './services/web3'
import { connect as connect3Box, getClient } from './services/3box'
import { connect as connectIpfs } from './services/ipfs'
import './App.css';
import {Grommet, Box, Main } from 'grommet'
import styled from 'styled-components'
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import Layout from './Layout'

const Background = styled(Box)`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: -1;
`

function App() {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        (async () => {
            await connect()
            await connectIpfs()
            setLoading(false)
        })()
    }, [])

    if (loading) {
        return <div>Loading...</div>
    }

    return (
        <Grommet>
            <Main>
                <Background background={'light-1'}/>
                <Router>
                    <Switch>
                        <Route path={'/'}>
                            <Layout/>
                        </Route>
                    </Switch>
                </Router>
            </Main>
        </Grommet>
    );
}

export default App;
