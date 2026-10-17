'use client'

import { createContext, useContext } from 'react'

/**
 * (Projects round 5, F-06) The Items table of a variation order — a quote in variation mode on a project: an omission is a line with a minus
 * quantity (the qty cell keeps its sign), and the totals read "Change to the contract". False for every other quote, so nothing changes there.
 */
export const VariationContext = createContext(false)
export const useVariation = () => useContext(VariationContext)
