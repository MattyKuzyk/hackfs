import { useParams } from 'react-router-dom'
import { Header, Heading, Box, TextInput, Text, Button, Form, Table, TableHeader, TableBody, TableCell, TableRow, FormField } from 'grommet'
import React, {useState, useEffect} from 'react'
import { downloadFile } from '../../services/ipfs'
import {getAddress, getProposalSubmissions, submitSolution, getProposal, endProposalDate, proposePayout} from '../../services/web3'
import { problemSchemaToProposal } from "../../utils"
import IpfsUploader from '../../components/IpfsUploader'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'
import BackArrow from "../../components/BackArrow"

const OverflowTableCell = styled(TableCell)`
    overflow-x: auto;
    max-width: 100px;
`

const DataField = ({label, value}) => {
    return <Box align={'start'}>
        <Text>{label}</Text>
        <Box direction={'row'} gap={'small'}>
            <TextInput value={value}/>
            <Button size={"medium"} primary label={'Download'} onClick={() => downloadFile(value, true)}/>
        </Box>
    </Box>
}

const SolutionRow = ({solution, showDispute}) => {
    const { cid, score, expectedReward, preprocessor } = solution
    const [showCids, setShowCids] = useState(false)

    return <TableRow>
        {showCids && <OverflowTableCell scope={'row'}>{cid}</OverflowTableCell>}
        {showCids && preprocessor && <OverflowTableCell scope={'row'}>{preprocessor}</OverflowTableCell>}
        {!showCids && <TableCell scope={'row'}>
            <Button primary label={'Download'} onClick={() => downloadFile(cid, true)}/>
        </TableCell>}
        {!showCids && preprocessor && <TableCell>
            <Button primary label={'Download'} onClick={() => downloadFile(preprocessor, true)}/>
        </TableCell>}
        <TableCell scope={'row'}>{score}</TableCell>
        <TableCell>{expectedReward}</TableCell>
        <TableCell>
            <Box>
            <Button size={"medium"}
                    primary
                    label={`${showCids ? 'Hide' : 'Show'} CIDs`}
                    onClick={() => setShowCids(!showCids)}/>
            {showDispute && <>
                <Box height={'10px'} width={'20px'}/>
                <Button size={'medium'} primary label={'Dispute'} disabled/>
            </>}
            </Box>
        </TableCell>
    </TableRow>
}

const SolutionTable = ({solutions, title, description, emptyText, showDispute}) => {
    return <Box gap={'small'} pad={'0 20px'} width={'600px'}>
        <Heading level={2} margin={'none'}>{title}</Heading>
        <Text>{description}</Text>
        {!!solutions.length && <Table>
            <TableHeader>
                <TableRow>
                    <TableCell scope="col" border="bottom">
                        Model File
                    </TableCell>
                    <TableCell>
                        Preprocessor Script
                    </TableCell>
                    <TableCell scope="col" border="bottom">
                        Accuracy Score
                    </TableCell>
                    <TableCell scope="col" border="bottom">
                        Expected Reward (ETH)
                    </TableCell>
                    <TableCell scope="col" border="bottom">
                    </TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {solutions.map(solution => <SolutionRow solution={solution} showDispute={showDispute}/>)}
            </TableBody>
        </Table>}
        {solutions.length === 0 && <Text weight={'bold'}>{emptyText}</Text>}
    </Box>
}

export default () => {
    const history = useHistory()
    const { address } = useParams()
    const [loading, setLoading] = useState(true)
    const [proposal, setProposal] = useState(null)
    const [solutions, setSolutions] = useState([])
    const [contractProposal, setContractProposal] = useState(null)

    useEffect(() => {
        (async () => {
            const proposalData = await downloadFile(address)
            console.log(JSON.parse(proposalData))
            setProposal(problemSchemaToProposal(JSON.parse(proposalData)))
            setSolutions(await getProposalSubmissions(address))
            setContractProposal(await getProposal(address))
            setLoading(false)
        })()
    }, [])

    const onSubmit = async ({model, accuracy, preprocessor}) => {
        await submitSolution({problemCid: address, solutionCid: model, accuracy, preprocessor})
        history.push('/')
    }

    const endProposal = async () => {
        await endProposalDate(address)
        history.push('/')
    }

    const triggerPayout = async () => {
        await proposePayout(address)
        history.push('/')
    }

    if (loading) return <h1>Loading...</h1>

    const { owner , status, endedOnMS } = contractProposal
    console.log('contract proposal', contractProposal)

    const { name, description, endDateMS, value, trainX, trainY, validateX, validateY, evaluation } = proposal

    const sortedSolutions = solutions.sort((a, b) => a.score > b.score ? 1 : -1)

    let maxScore = 0
    let totalPerformance = 0
    sortedSolutions.forEach(solution => {
        if (maxScore < solution.score || 0) {
            maxScore = solution.score
        }
    })


    sortedSolutions.forEach(solution => {
        solution.performance = solution.score / maxScore
        totalPerformance += solution.performance
    })

    sortedSolutions.forEach(solution => {
        solution.expectedReward = ((solution.score / maxScore) / totalPerformance) * value
    })

    const yourSolutions = sortedSolutions.filter(solution => solution.owner === getAddress())
    const theirSolutions = sortedSolutions.filter(solution => solution.owner !== getAddress())

    const isOwner = owner === getAddress()

    const hasEndedDate = endDateMS < Date.now()
    const hasEnded = status === "0"
    const inReview = status === "2"
    const reviewEnded = Date.now() - endDateMS > 30000

    return <Box gap={'medium'}>
        <Header background={'light-3'} pad={'40px 10px 20px 10px'}>
            <Box align={'start'}>
                <Heading margin={'none'}>Proposal</Heading>
                <Heading level={2} margin={'10px 0'}>{name}</Heading>
                <Heading margin='none' level={4} textAlign={'left'}>{description}</Heading>
            </Box>
            <Box align={'end'} pad={'medium'}>
                <Heading color={'neutral-2'} level={3} margin={'none'}>Bounty Value:</Heading>
                <Heading color={'neutral-2'} level={3} margin={'5px 0'}>{value} ETH</Heading>
                <Text weight={'bold'}>{`${hasEndedDate ? 'Ended' : 'Ends'}`} On: {(new Date(endDateMS)).toLocaleString()}</Text>
                {inReview && <Text weight={'bold'}>In Review Until: {(new Date(Number(endDateMS + 30000))).toLocaleString()}</Text>}
                <Box height={'10px'} width={'10px'}/>
                {hasEndedDate && !inReview && <Button primary label={'Trigger Review'} onClick={endProposal}/>}
                {inReview && reviewEnded && <Button primary label={'Payout Rewards'} onClick={triggerPayout}/>}
                {hasEnded && <Text>Proposal is now finished</Text>}
            </Box>
        </Header>
        <BackArrow onClick={() => history.push('/')} />
        <Box direction={'row'}>
            <Box width={'50%'} align={'center'} gap={'medium'}>
                <Box gap={'small'} pad={'0 20px'}>
                    <Heading level={2} margin={'none'}>Problem Set Data</Heading>
                    <Text>The data specified for this problem set. Download directly or use the IPFS address.</Text>
                </Box>
                <DataField label={'Training Feature Data'} value={trainX}/>
                <DataField label={'Training Target Data'} value={trainY}/>
                <DataField label={'Validate Feature Data'} value={validateX}/>
                <DataField label={'Validate Target Data'} value={validateY}/>
                <DataField label={'Evaluation Script'} value={evaluation}/>

            </Box>
            <Box width={'50%'} align={'center'} gap={'medium'}>
                {!isOwner && !hasEndedDate && <>
                    <Box gap={'small'} width="600px" pad={'0 20px 10px 20px'}>
                        <Heading level={2} margin={'none'}>Model Submission</Heading>
                        <Text>Submit your trained model to claim part of this bounty</Text>
                    </Box>
                    <Box width={"600px"} pad={"0 10px"}>
                        <Form onSubmit={({value}) => onSubmit(value)}>
                            <Box align={'start'}>
                                <IpfsUploader name={'model'} label={'Model File'} required/>
                                <IpfsUploader name={'preprocessor'} label={'Preprocessor Script'}/>
                                <Box align={'start'} margin={'10px 0'} pad={'0 10px'}>
                                    <Text margin={'5px 0'}>Accuracy Score</Text>
                                    <FormField validate={(value, {accuracy}) => {
                                        return Number(accuracy) > 100 && 'Value cannot be higher than 100'
                                    }}>
                                        <TextInput type='number' name={'accuracy'} required/>
                                    </FormField>
                                </Box>
                                <Button margin={'10px 0'} label={'Submit Model'} type={'submit'} primary/>
                            </Box>
                        </Form>
                    </Box>
                    <Box width={'20px'} height={'20px'}/>
                </>}
                {!isOwner && <>
                    <SolutionTable
                        title={'Your Submitted Solution'}
                        description={'Your trained model submitted for this training proposal'}
                        emptyText={'You haven\'t submitted a solution yet! Use the form above.'}
                        solutions={yourSolutions}
                        showDispute
                    />
                    <Box width={'20px'} height={'30px'}/>
                    <SolutionTable
                        title={'Other Submitted Solutions'}
                        description={'Trained models submitted for this training proposal'}
                        emptyText={'No solutions have been submitted yet!'}
                        solutions={theirSolutions}
                    />
                </>}
                {isOwner && <SolutionTable
                    title={'Submitted Solutions'}
                    description={'Trained models submitted for your training proposal'}
                    emptyText={'No solutions have been submitted yet!'}
                    solutions={sortedSolutions}
                />}
                <Box width={'20px'} height={'40px'}/>
            </Box>
        </Box>
    </Box>
}
