import React, { useState, useEffect } from 'react'

function formatTime(ms) {
    let seconds = Math.floor(ms / 1000)
    let minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    seconds = seconds % 60
    minutes = minutes % 60
    if (minutes < 1) {
        return `${seconds}s`
    } else if (hours < 1) {
        return `${minutes}min ${seconds}s`
    } else if (days < 1) {
        return `${hours}h ${minutes}min ${seconds}s`
    } else {
        return `${days}d${hours}h ${minutes}min ${seconds}s`
    }
}

interface TimerProps {
    timeLeft: number
    totalDuration: number
}

function CircularProgressBar({ timeLeft, totalDuration }: TimerProps) {
    const [progress, setProgress] = useState(0)
    const [needToReview, setNeedToReview] = useState(false)
    const [needToLearnNewWords, setNeedToLearnNewWords] = useState(false)

    useEffect(() => {
        setProgress((timeLeft / totalDuration) * 100)
    }, [timeLeft, totalDuration])

    const radius = 90 // 半径
    const circumference = 2 * Math.PI * radius // 圆的周长
    const strokeDashoffset = circumference * (1 - progress / 100)

    return (
        <div
            style={{
                position: 'relative',
                width: 200,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg width='200' height='200'>
                <circle cx='100' cy='100' r={radius} fill='none' stroke='#eee' strokeWidth='10' />
                <circle
                    cx='100'
                    cy='100'
                    r={radius}
                    fill='none'
                    stroke='#03a9f4'
                    strokeWidth='10'
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap='round'
                    transform='rotate(-90 100 100)'
                />
            </svg>
            <div style={{ position: 'absolute' }}>下一次复习时间：{formatTime(timeLeft)}</div>
        </div>
    )
}

export default CircularProgressBar
