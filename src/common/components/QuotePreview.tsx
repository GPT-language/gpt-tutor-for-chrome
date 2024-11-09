import React from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { IoMdClose } from 'react-icons/io'
import { useChatStore } from '@/store/file/store'

interface QuotePreviewProps {
    showFullText: boolean
    toggleFullText: () => void
    onClose: () => void
    previewLength?: number
}

const QuotePreview: React.FC<QuotePreviewProps> = ({ showFullText, toggleFullText, onClose, previewLength = 100 }) => {
    const { t } = useTranslation()
    const { selectedWord } = useChatStore()
    const previewText =
        selectedWord?.text && selectedWord?.text.length > previewLength
            ? selectedWord.text.slice(0, previewLength) + '...'
            : selectedWord?.text

    return (
        <Block position='relative' style={{ marginBottom: '10px' }}>
            <Block
                $style={{
                    fontStyle: 'italic',
                    fontSize: '14px',
                    borderLeft: '3px solid gray',
                    paddingLeft: '10px',
                    paddingRight: '30px',
                    marginBottom: '10px',
                    backgroundColor: 'transparent',
                }}
            >
                &quot;{previewText}&quot;
                <Button
                    onClick={onClose}
                    size='mini'
                    kind='tertiary'
                    style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        padding: '2px',
                        minWidth: 'auto',
                    }}
                >
                    <IoMdClose size={16} />
                </Button>
            </Block>
            {selectedWord?.text && (
                <Button onClick={toggleFullText} size='mini'>
                    {showFullText ? t('Show Less') : t('Show Full Text')}
                </Button>
            )}
        </Block>
    )
}

export default QuotePreview
