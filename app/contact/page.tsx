import type { Metadata } from 'next';
import ArticlePage from '@/components/ArticlePage';

export const metadata: Metadata = { title: 'Contact Rival Royale', description: 'Get help with Rival Royale, report a broken tool or content correction, or ask about your account and privacy.', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return <ArticlePage title="Contact Rival Royale" intro="Need help with the tracker, a deck tool, or your account? Send a message so the problem can be reproduced and reviewed.">
    <section><h2>Support and feedback</h2><p>Email <a href="mailto:wwwestonwalker@gmail.com">wwwestonwalker@gmail.com</a>. For a bug, include the page URL, your device/browser, what you expected, and what happened. For a card or matchup issue, include all eight cards, their forms, and relevant levels.</p><p>Do not send passwords, authentication tokens, payment information, or another player’s private account details. You can describe a problem without sharing your full battle history.</p></section>
    <section><h2>Account and privacy requests</h2><p>Use the same email address for questions about stored data or to request account/data deletion. Write from the email associated with your Rival Royale account when possible. Account ownership may need to be verified before private records are discussed or changed.</p></section>
    <section><h2>Content corrections</h2><p>Point to the sentence or card detail you believe is wrong and explain the correction. If a balance update changed an interaction, include the update date or an official source. A model estimate is not a guarantee; a surprising result can still help identify a coverage problem.</p></section>
  </ArticlePage>;
}
