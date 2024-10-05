import React from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { IoMdClose } from 'react-icons/io'

interface QuotePreviewProps {
    text: string
    onShowMore: () => void
    onClose: () => void
    previewLength?: number
}

const QuotePreview: React.FC<QuotePreviewProps> = ({ text, onShowMore, onClose, previewLength = 100 }) => {
    const { t } = useTranslation()
    const previewText = text.length > previewLength ? text.slice(0, previewLength) + '...' : text

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
            {text.length > previewLength && (
                <Button onClick={onShowMore} size='mini'>
                    {t('Show Full Text')}
                </Button>
            )}
        </Block>
    )
}

export default QuotePreview
