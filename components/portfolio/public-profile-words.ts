/** (pending modules S27) A piece of work's facts line on the Public profile — its facts and how many pictures it has. */
export const workLine = (facts: string, pictures: number) => [facts, `${pictures} ${pictures === 1 ? 'picture' : 'pictures'}`].filter(Boolean).join(' · ')
