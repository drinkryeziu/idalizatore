// Prompts from handoff section 5. These run on the BACKEND only (the API key never ships in the app); kept here so server and app share one source.
import type { Idea } from './types';

const flat = (s: string, n = 320) => s.replace(/\s+/g, ' ').slice(0, n);

export function filePrompt(raw: string, ideas: Pick<Idea, 'id' | 'title' | 'transcript'>[], targetId?: string): string {
  const list = ideas.map((i) => ({ id: i.id, title: i.title, summary: flat(i.transcript) }));
  const target = targetId ? ideas.find((i) => i.id === targetId) : undefined;
  return [
    'You are the note-taker inside Idealizator, an app where people speak business ideas out loud. Below is a raw speech-to-text recording. Do two jobs.',
    '',
    'JOB 1, polish. Rewrite the recording as clean written text: remove filler words (um, uh, like, you know), false starts, repetitions, self-corrections, background noise and transcription garbage; fix grammar and punctuation. Keep every real detail and the speaker\'s meaning. Do not add ideas, opinions or facts that were not said. Write in the same language the speaker used. 1 to 4 short sentences per paragraph. If the recording contains no actual idea content, return "text": "".',
    '',
    target
      ? `JOB 2 is already decided: the speaker is adding to the idea "${target.title}" (${flat(target.transcript)}). Write the polished text so it reads as a continuation of that idea, without repeating what it already says. Return "decision": "existing".`
      : 'JOB 2, file it. Decide which saved idea this recording is about. The speaker may be elaborating on a saved idea without naming it (for example talking about shingles and gutters when a roofing idea is saved).\n- "existing": it is clearly about one saved idea. Put that idea\'s id first in "candidates".\n- "unsure": it is related to one or more saved ideas but you cannot clearly tell which, or whether it is a separate idea. Put the most related ids in "candidates", most related first, at most 3.\n- "new": it is not about any saved idea. "candidates" is empty.',
    '',
    'Saved ideas:',
    JSON.stringify(list),
    '',
    'Recording:',
    '"""', raw, '"""',
    '',
    'Reply with JSON only, in exactly this shape:',
    '{"text": string, "decision": "existing" | "unsure" | "new", "candidates": [string], "title": string}',
    '"title" is a 2 to 5 word Title Case name for the idea, in the speaker\'s language, used only if it is saved as a new idea.',
  ].join('\n');
}

export function reportPrompt(ideaText: string, imageCount = 0): string {
  return [
    'You are Idealizator, an AI that tells founders whether a spoken idea is worth pursuing. Assess the idea below for the market and write a short business and marketing plan.',
    '',
    'Idea, transcribed from speech (it may contain transcription mistakes):',
    '"""', ideaText, '"""',
    imageCount ? `The person also attached ${imageCount} image${imageCount > 1 ? 's' : ''}; use them as context.` : '',
    '',
    'LANGUAGE: The idea can be in any language. Work out which language it is written in (if it mixes languages, take the main one) and write EVERYTHING in that same language: the title, all five section titles, every paragraph, lead and list item, and the caption. Translate the section titles given below into that language. Do not answer in English unless the idea is in English.',
    '',
    'Reply with JSON only, no text before or after it, in exactly this shape:',
    '{"language": string, "languageName": string, "caption": string, "title": string, "score": integer, "verdict": string, "factors": [{"label": string, "score": integer}], "chart": {"title": string, "kind": "share" | "bars", "unit": string, "section": integer, "items": [{"label": string, "value": number}]}, "similar": {"title": string, "items": [{"name": string, "kind": string, "note": string}]}, "equipment": {"title": string, "items": [{"item": string, "why": string, "where": [string]}]}, "sections": [{"title": string, "blocks": [{"kind": "paragraph", "text": string} | {"kind": "lead", "text": string} | {"kind": "list", "items": [string]}]}]}',
    '',
    'Rules:',
    '- language: the BCP-47 code of the idea\'s language, such as "en", "sq", "de", "es-MX", "ar", "ja".',
    '- languageName: that language\'s own name for itself, such as "English", "Shqip", "Deutsch", "العربية".',
    '- caption: "The forecasted success rate." translated into that language.',
    '- title: the idea\'s name in 2 to 5 words, Title Case, no quotes.',
    '- verdict: the score in 2 to 4 plain words, in the idea\'s language, such as "Strong potential", "Promising, with risks" or "High risk".',
    '- factors: exactly 5 things that drive the score for THIS idea, each with a 1 to 3 word label in the idea\'s language and a score from 0 to 100 where higher is always better for the idea (so rate "room among competitors", not "competition"). Typical ones are market demand, room among competitors, ease of building, earning potential and uniqueness; swap in ones that matter more for this idea.',
    '- chart: ONE extra chart with the numbers most useful for this particular idea, as your estimate. Pick what fits: a suggested marketing budget split, a revenue mix, a startup cost breakdown, customer segments ("share": 3 to 5 items whose values are percentages adding up to 100, unit "%"), or a comparison such as price points or monthly revenue by year ("bars": 3 to 5 items, with a short unit such as "$", "€" or "k users"). "section" is the number (1 to 5) of the section it belongs to. Title of 2 to 5 words, labels of 1 to 3 words, all in the idea\'s language.',
    '- similar: 3 to 5 REAL, well-known companies, products, apps or existing ideas that already do something close to this idea. "name" is the real name as people know it, "kind" is one word such as Company, App, Product, Service or Idea (in the idea\'s language), "note" is one short sentence on what they do or how they differ. Never invent a name: if you are not sure it exists, leave it out. "title" is "Similar ideas & companies" translated.',
    '- equipment: only when the idea needs physical equipment, tools, hardware or materials to start (a food truck needs a truck and a grill; a pure software idea needs none, so return an empty items list). Up to 5 items. "item" is a 1 to 4 word name, "why" one short sentence, and "where" 2 or 3 well-known places to buy it for the idea\'s likely country or worldwide (such as Amazon, IKEA, Home Depot, Alibaba, a restaurant-supply chain). Real stores only, no prices, no links. "title" is "Equipment & where to buy" translated.',
    '- score: the forecasted chance of market success as a whole percentage, 0 to 100. Be realistic: most ideas land between 30 and 75.',
    '- sections: exactly five, in this order: "Concept & Accessibility", "Market Success Potential", "Competition Analysis", "Marketing Approach", "Pricing Strategy". If the idea is an app, title the first one "App Concept & Accessibility".',
    '- Each section: 50 to 120 words in 2 to 4 blocks. A lead ends with a colon and is always followed by a list. Lists have 2 to 5 short items; when an item needs a reason, write "Label: explanation."',
    '- Put the business plan (customers, revenue model, costs, first steps) in Market Success Potential and Pricing Strategy, and the marketing plan (audience, channels, launch steps) in Marketing Approach.',
    '- Speak to the founder as "you". Plain, practical and honest about risks. No hype, no emoji, no markdown.',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
