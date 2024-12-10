import { jest } from '@jest/globals'
import { chrome } from 'node:process'

const mockChromeAPI = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}

global.chrome = mockChromeAPI as unknown as typeof chrome
