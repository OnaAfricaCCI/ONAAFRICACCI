/**
 * Render the "Your Ona Funds profile is ready" confirmation email to files, so
 * it can be eyeballed offline without sending anything.
 *
 *   node --import tsx scripts/preview-confirmation-email.ts
 *   (or: npm run email:preview)
 *
 * Writes confirmation-email.html and confirmation-email.txt to the current
 * directory and prints their paths. Open the .html in a browser.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderConfirmationEmail, PROFILE_EMAIL_SUBJECT } from '../lib/profileEmailTemplate'

const { html, text } = renderConfirmationEmail()
const htmlPath = resolve(process.cwd(), 'confirmation-email.html')
const textPath = resolve(process.cwd(), 'confirmation-email.txt')
writeFileSync(htmlPath, html)
writeFileSync(textPath, text)

console.log('Subject: ' + PROFILE_EMAIL_SUBJECT)
console.log('Wrote:')
console.log('  ' + htmlPath)
console.log('  ' + textPath)
console.log('\n--- plain text ---\n')
console.log(text)
