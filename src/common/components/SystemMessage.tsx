import React from 'react'
import { ParagraphSmall } from 'baseui-sd/typography'
import { LanguageSelector } from './Settings'
import { FormControl } from 'baseui-sd/form-control'
import { TbDirectionSign } from 'react-icons/tb'

interface SystemMessageProps {
    message: string
    component?: string
    settings: {
        defaultTargetLanguage: string
        defaultSourceLanguage: string
    }
    onLanguageChange: (key: string) => (value: string) => void
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message, component, settings, onLanguageChange }) => {
    const renderComponent = () => {
        switch (component) {
            case 'LanguageSelectors':
                return (
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                        <FormControl label='The Language You are Using'>
                            <LanguageSelector
                                value={settings.defaultTargetLanguage}
                                onChange={onLanguageChange('defaultTargetLanguage')}
                            />
                        </FormControl>
                        <div style={{ marginTop: '10px' }}>
                            <TbDirectionSign size={18} />
                        </div>
                        <FormControl label='The Language You Want to Learn'>
                            <LanguageSelector
                                value={settings.defaultSourceLanguage}
                                onChange={onLanguageChange('defaultSourceLanguage')}
                            />
                        </FormControl>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div>
            <ParagraphSmall>{message}</ParagraphSmall>
            {renderComponent()}
        </div>
    )
}
