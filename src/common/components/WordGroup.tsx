import React from 'react'

interface WordGroupProps {
    words: string[]
    subject: string
    onClick: (word: string) => void
}

const styles = {
    主语: 'bg-blue-100',
    谓语: 'bg-orange-100',
    宾语: 'bg-yellow-100',
    默认: 'bg-gray-100',
}

const WordGroup: React.FC<WordGroupProps> = ({ words, subject }) => {
    return (
        <span className={`word-group ${styles[subject as keyof typeof styles] || styles.默认} m-1 p-1 rounded-md`}>
            {words.map((word, index) => (
                <span key={index} className='word m-1'>
                    {word}
                </span>
            ))}
        </span>
    )
}

export default WordGroup
