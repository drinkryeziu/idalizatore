// SAMPLE legal text. Have a lawyer review both documents before launch, and replace the company name, address and support email.
// Terms: ported from the approved prototype. Privacy Policy: a draft written from what this app and server actually do today.
export const LEGAL_UPDATED = '13 November 2026';
export const SUPPORT_EMAIL = 'support@idealizator.example';

export type LegalDoc = { title: string; sections: [string, string[]][] };

export const TERMS: LegalDoc = {
  title: 'Terms of Use',
  sections: [
    ['About these terms', ['These terms explain how you may use Idealizator, the app that turns a spoken idea into a score, a business plan and a marketing plan. By creating an account or using the app you agree to them.']],
    ['Your account', ['You need an account to keep your ideas. Give us a correct email address, choose a strong password and keep it private. You are responsible for what happens under your account.', 'You must be old enough to enter a contract where you live.']],
    ['Your ideas belong to you', ['Everything you record, type or attach stays yours. You give us only the permission we need to store it, process it and show it back to you.']],
    ['Where your ideas are stored', ['Your ideas are stored on our server and on your iPhone. In Settings you can choose to keep them on the server, on the iPhone only, or on both.', 'Keeping a copy on the server lets you reach your ideas on other devices and restore them if you lose your phone. If you delete an idea, it is removed from both places.']],
    ['We do not sell your ideas or your information', ['We do not sell your ideas, your reports or your personal information, and we do not share them with advertisers.', 'To write a report, the text of an idea is sent to the AI service we use for analysis. It acts for us and may use your text only to produce your result.']],
    ['AI analysis is guidance, not a promise', ['The score, the business plan, the marketing plan and the lists of similar companies or equipment are estimates made by AI. They can be wrong or out of date and are not financial, legal or professional advice. Check the facts before you spend money or time on an idea.']],
    ['Plans and payments', ['Paid plans are billed monthly or yearly and renew until you cancel. You can cancel in Settings under Plan & billing, and your plan stays active until the end of the period you paid for.', 'Payments are processed by Stripe. We never see or store your full card number; Stripe handles it under its own terms and privacy policy.']],
    ['Using Idealizator responsibly', ['Do not use the app to break the law, to harm others, to upload content you have no right to share, or to try to break or overload our systems.']],
    ['Changes and ending', ['We may update these terms and will tell you in the app before important changes take effect. You can stop using Idealizator and delete your account at any time. We may suspend accounts that break these terms.']],
    ['Contact', [`Questions about these terms? Write to ${SUPPORT_EMAIL}.`]],
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  sections: [
    ['Who we are', ['Idealizator ("we") is the app and service described in these documents. This policy explains what we collect, why, who helps us process it, and the choices you have.']],
    ['What we collect', [
      'Account: your name, your email address, and your password in hashed form (we cannot read your password). We also keep a session record so you stay signed in.',
      'Your content: the text of your ideas, any images you attach, and the reports the AI writes for them.',
      'Your voice: when you hold the microphone button, the recording is sent to be turned into text. We do not keep the audio after it is transcribed, and only the cleaned-up text is saved.',
      'Basic technical logs: request times and error messages, used to keep the service running and to prevent abuse. They do not contain the text of your ideas.',
    ]],
    ['Why we use it', ['To run your account, to clean up and file your recordings, to write your score and reports, to sync your ideas between your devices, to send you account emails such as email confirmation and password reset, and to protect the service from abuse.']],
    ['Who helps us process it', [
      'AI analysis: the text of an idea, and any images you attached, is sent to Anthropic to write the cleaned-up text and the report.',
      'Speech to text: recordings are sent to OpenAI to be transcribed.',
      'Email: account emails are sent through our email provider.',
      'Hosting: our server and database run with our hosting provider.',
      'These providers act for us and may use your data only to provide their service to us. We do not sell your ideas or your personal information, and we do not share them with advertisers.',
    ]],
    ['Where your ideas are kept', ['You choose in Settings: on your iPhone only, on our server, or on both. If you choose iPhone only, your ideas are not copied to our server (the text of an idea is still sent to the AI service when you ask for an analysis). Images stay on your iPhone and are not synced to our server in this version.']],
    ['How long we keep it', ['We keep your account and ideas until you delete them or delete your account. Deleting an idea removes it from your iPhone and our server. Deleting your account removes your account and all your ideas from our server and from your iPhone.']],
    ['Your choices', ['You can edit or delete any idea, change your password, change where ideas are kept, and delete your account in Settings. To ask for a copy of your data or for help with a request, write to ' + SUPPORT_EMAIL + '. Depending on where you live, you may have further rights such as access, correction or objection, and we will respect them.']],
    ['Security', ['Passwords are stored with a modern hashing method, your session is kept in the iPhone Keychain, and data travels between the app and our server over an encrypted connection. No system is perfectly secure, so please use a strong, unique password.']],
    ['Children', ['Idealizator is not meant for children under the age at which you can enter a contract where you live, and we do not knowingly collect their data.']],
    ['Changes', ['We may update this policy and will tell you in the app before important changes take effect.']],
    ['Contact', [`Questions about privacy? Write to ${SUPPORT_EMAIL}.`]],
  ],
};
