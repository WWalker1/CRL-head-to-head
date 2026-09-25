"""Conservative cohort labels. Unknown events are never implicitly normal Ranked."""
from collect import candidate

RANKED_MODES={72000464:'Ranked1v1_NewArena2',72000450:'Ranked1v1_NewArena'}
# Observed IDs/names from raw API samples. Drafts stay a separate research cohort.
DRAFT_MODES={72000042:'PickMode',72000194:'Draft_Competitive'}


def classify(b):
    mode=b.get('gameMode',{}); name=mode.get('name','').lower()
    if any(word in name for word in ('chaos','crazy','touchdown','infinite','tripleelixir','doubleelixir','suddendeath','overtime')) or b.get('modifiers'):
        return 'modified_or_other_rules'
    if not candidate(b): return 'not_eight_card_1v1'
    if b.get('isHostedMatch') or b.get('isLadderTournament'): return 'hosted_or_tournament_review'
    if b.get('type')=='pathOfLegend' and mode.get('id') in RANKED_MODES and b.get('deckSelection')=='collection':
        league=b.get('leagueNumber')
        return {5:'grand_champion_ranked',6:'royal_champion_ranked',7:'ultimate_champion_ranked'}.get(league,'lower_or_unknown_ranked')
    if mode.get('id') in DRAFT_MODES and mode.get('name')==DRAFT_MODES[mode['id']] and b.get('deckSelection') in ('pick','draft','draftCompetitive'):
        return 'draft_research_only'
    return 'unknown_review_required'
