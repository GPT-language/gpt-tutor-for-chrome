import React, { useEffect, useState } from 'react'
import { parse } from 'best-effort-json-parser'

// Sentence 接口定义
interface Sentence {
    word: string
    subject: string
    translation?: string
    onClick: (word: string) => void
}

interface TextParserProps {
    jsonContent: string
    setOriginalText: (word: string) => void
}

const WordSegment: React.FC<Sentence> = ({ word, subject, translation, onClick }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: '5px' }}>
            <div style={{ fontSize: 'smaller', color: '#666', marginRight: '10px' }}>{subject}</div>
            <div
                style={{
                    margin: '0 10px',
                    background: styles[subject as keyof typeof styles],
                    padding: '5px 10px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                }}
                onClick={() => onClick(word)}
            >
                {word}
            </div>
            {translation && <div style={{ fontSize: 'smaller', color: '#666', marginLeft: '10px' }}>{translation}</div>}
        </div>
    )
}

const styles = {
    主语: '#E8F4FF', // 浅蓝色，用于主语
    谓语: '#FFE3CA', // 浅橙色，用于谓语
    宾语: '#FFFCDC', // 浅黄色，用于宾语
    时间状语: '#B7E1CD', // 浅绿色，用于时间状语
    地点状语: '#FAD9A1', // 浅棕色，用于地点状语
    方式状语: '#C4A3D1', // 浅紫色，用于方式状语
    副词: '#FADADD', // 粉色，用于副词
    介词短语: '#D4E2D4', // 浅灰绿色，用于介词短语
    默认: '#F5F5F5', // 默认灰色，用于未特别分类的其他语法类别
}

const TextParser: React.FC<TextParserProps> = ({ jsonContent, setOriginalText }) => {
    const [sentences, setSentences] = useState<Sentence[] | null>([])

    useEffect(() => {
        // 清洗 JSON 字符串，去除 Markdown 反引号
        const cleanJson = jsonContent.replace(/```json\n|\n```/g, '').trim()
        try {
            const content: Sentence[] = parse(cleanJson)
            setSentences(content)
        } catch (error) {
            console.error('Failed to parse JSON content', error)
            setSentences(null)
        }
    }, [jsonContent]) // 依赖数组包括 jsonContent，确保当 jsonContent 变化时重新执行解析

    return (
        <div>
            {sentences?.map((sentence, index) => (
                <WordSegment
                    key={index}
                    word={sentence.word}
                    subject={sentence.subject}
                    translation={sentence.translation}
                    onClick={setOriginalText}
                />
            ))}
        </div>
    )
}

export default TextParser
