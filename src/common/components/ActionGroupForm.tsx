import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from 'baseui-sd/modal'
import { FormControl } from 'baseui-sd/form-control'
import { Input } from 'baseui-sd/input'
import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Action, ActionGroup } from '../internal-services/db'

interface ActionGroupFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (actionGroup: ActionGroup) => void
    title: string
    actions: Action[]
}

export function ActionGroupForm({ isOpen, onClose, onSubmit, title, actions }: ActionGroupFormProps) {
    const { t } = useTranslation()
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [price, setPrice] = useState(0)
    const [version, setVersion] = useState('1.0.0')
    const [language, setLanguage] = useState('')
    const [targetLanguage, setTargetLanguage] = useState('')

    const handleSubmit = () => {
        const actionGroup: ActionGroup = {
            id: nanoid(),
            title,
            description,
            category,
            price,
            version,
            language,
            targetLanguage,
            actions,
        }
        onSubmit(actionGroup)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} closeable animate autoFocus>
            <ModalHeader>{t('Publish Action Group')}</ModalHeader>
            <ModalBody>
                <FormControl label={t('Title')}>
                    <Input value={title} disabled />
                </FormControl>
                <FormControl label={t('Description')}>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.currentTarget.value)}
                        placeholder={t('Enter description') || ''}
                    />
                </FormControl>
                <FormControl label={t('Category')}>
                    <Input
                        value={category}
                        onChange={(e) => setCategory(e.currentTarget.value)}
                        placeholder={t('Enter category') || ''}
                        required
                    />
                </FormControl>
                <FormControl label={t('Price')}>
                    <Input
                        type='number'
                        value={price.toString()}
                        onChange={(e) => setPrice(Number(e.currentTarget.value))}
                    />
                </FormControl>
                <FormControl label={t('Version')}>
                    <Input value={version} onChange={(e) => setVersion(e.currentTarget.value)} placeholder='1.0.0' />
                </FormControl>
                <FormControl label={t('Language')}>
                    <Input
                        value={language}
                        onChange={(e) => setLanguage(e.currentTarget.value)}
                        placeholder={t('Enter source language') || ''}
                    />
                </FormControl>
                <FormControl label={t('Target Language')}>
                    <Input
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.currentTarget.value)}
                        placeholder={t('Enter target language') || ''}
                    />
                </FormControl>
            </ModalBody>
            <ModalFooter>
                <ModalButton kind='tertiary' onClick={onClose}>
                    {t('Cancel')}
                </ModalButton>
                <ModalButton onClick={handleSubmit}>{t('Submit')}</ModalButton>
            </ModalFooter>
        </Modal>
    )
}
