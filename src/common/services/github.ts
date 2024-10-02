import { Octokit } from '@octokit/rest'
import ChineseActionsData from '../services/Chinese.json'
import EnglishActionData from '../services/English.json'
import TraditionalChineseActionData from '../services/TraditionalChinese.json'
import JapaneseActionData from '../services/Japanese.json'
import RussianActionData from '../services/Russian.json'
import KoreanActionData from '../services/Korean.json'
import ThaiActionData from '../services/Thai.json'
import HindiActionData from '../services/Hindi.json'
import ArabicActionData from '../services/Arabic.json'
import FrenchActionData from '../services/French.json'
import GermanActionData from '../services/German.json'
import { Action } from '../internal-services/db'

export interface ParsedChange {
  type: 'info' | 'context' | 'addition' | 'deletion'
  content: string
}

export interface ParsedPatch {
  fileName: string
  changes: ParsedChange[]
}

export function parsePatch(patch: string): ParsedPatch {
  const lines = patch.split('\n')
  const changes: ParsedChange[] = []
  const fileName = ''

  lines.forEach((line) => {
    if (line.startsWith('@@')) {
      changes.push({ type: 'info', content: line })
    } else if (line.startsWith('+')) {
      changes.push({ type: 'addition', content: line })
    } else if (line.startsWith('-')) {
      changes.push({ type: 'deletion', content: line })
    } else {
      changes.push({ type: 'context', content: line })
    }
  })

  return { fileName, changes }
}

export interface UpdateResult {
  updatedContent: Record<string, { patch: string; parsedPatch: ParsedPatch }>
  latestSha: string
}

const octokit = new Octokit({ auth: import.meta.env.VITE_REACT_APP_GITHUB_TOKEN })

export const checkForUpdates = async (languageCode: string): Promise<UpdateResult | null> => {
  const owner = 'GPT-language'
  const repo = 'gpt-tutor-resources'
  const path = `default/${getFilenameForLanguage(languageCode)}`

  try {
    // 获取最新的提交
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 1,
    })

    if (commits.length === 0) {
      console.log('No commits found for the file')
      return null
    }

    const latestCommit = commits[0]
    const latestSha = latestCommit.sha
    const lastCheckedSha = localStorage.getItem(`${languageCode}_last_checked_sha`)

    console.log(`Latest commit SHA: ${latestSha}`)
    console.log(`Last checked SHA: ${lastCheckedSha}`)

    if (latestSha !== lastCheckedSha) {
      const updatedContent: UpdateResult['updatedContent'] = {}
      // 获取提交的详细信息
      const { data: commitData } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: latestSha,
      })

      console.log('Commit data:', JSON.stringify(commitData, null, 2))

      commitData.files?.forEach((file) => {
        console.log(`Processing file: ${file.filename}`)
        console.log(`File patch: ${file.patch}`)
        if (file.filename === path && file.patch) {
          try {
            const parsedPatch = parsePatch(file.patch)
            updatedContent[file.filename] = {
              patch: file.patch,
              parsedPatch: parsedPatch,
            }
            console.log(`Successfully parsed patch for ${file.filename}`)
          } catch (parseError) {
            console.error(`Error parsing patch for ${file.filename}:`, parseError)
          }
        } else {
          console.log(`Skipping file ${file.filename} (doesn't match path or no patch)`)
        }
      })

      if (Object.keys(updatedContent).length > 0) {
        return { updatedContent, latestSha }
      } else {
        console.log('No updates found in the commit')
      }
    }

    console.log('No new updates available.')
    return null
  } catch (error) {
    console.error('Error checking for updates:', error)
    if (error instanceof Error && 'response' in error) {
      const responseError = error as { response?: { data: any; status: number; headers: any } }
      if (responseError.response) {
        console.error('Error response:', responseError.response.data)
        console.error('Error status:', responseError.response.status)
        console.error('Error headers:', responseError.response.headers)
      }
    }
    throw new Error('Failed to check for updates')
  }
}

export const updateLastCheckedSha = (languageCode: string, sha: string) => {
  localStorage.setItem(`${languageCode}_last_checked_sha`, sha)
  localStorage.setItem(`${languageCode}_last_check_time`, Date.now().toString())
}

export const getFilenameForLanguage = (languageCode: string): string => {
  switch (languageCode) {
    case 'zh-Hans':
      return 'Chinese.json'
    case 'zh-Hant':
      return 'TraditionalChinese.json'
    case 'en':
      return 'English.json'
    case 'ja':
      return 'Japanese.json'
    case 'ko':
      return 'Korean.json'
    case 'ru':
      return 'Russian.json'
    case 'th':
      return 'Thai.json'
    case 'ar':
      return 'Arabic.json'
    case 'hi':
      return 'Hindi.json'
    case 'fr':
      return 'French.json'
    case 'de':
      return 'German.json'
    default:
      console.log('Unsupported language code')
      return 'English.json'
  }
}

// 根据语言代码获取本地数据的函数
export function getLocalData(languageCode: string): Action[] {
  switch (languageCode) {
    case 'zh-Hans':
      return ChineseActionsData as Action[]
    case 'zh-Hant':
      return TraditionalChineseActionData as Action[]
    case 'en':
      return EnglishActionData as Action[]
    case 'ja':
      return JapaneseActionData as Action[]
    case 'ko':
      return KoreanActionData as Action[]
    case 'ru':
      return RussianActionData as Action[]
    case 'th':
      return ThaiActionData as Action[]
    case 'ar':
      return ArabicActionData as Action[]
    case 'hi':
      return HindiActionData as Action[]
    case 'fr':
      return FrenchActionData as Action[]
    case 'de':
      return GermanActionData as Action[]
    default:
      console.log('Unsupported language code, falling back to English')
      return EnglishActionData as Action[]
  }
}

export function fromBase64(base64: string): string {
  try {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch (error) {
    console.error('Error decoding from Base64:', error, 'Input string:', base64)
    throw new Error('Failed to decode from Base64.')
  }
}
