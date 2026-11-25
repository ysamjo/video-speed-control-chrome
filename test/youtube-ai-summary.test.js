const { load, tick, suite } = require('./harness')

const YT = { hostname: 'www.youtube.com', pathname: '/watch' }
const flush = () => tick(650)

async function run() {
  const s = suite()

  {
    const env = load({ ...YT })
    await flush()
    s.check('KI-Zusammenfassung ist standardmäßig deaktiviert', env.summaryClicks(), 0)
    s.check('Deaktivierte Option klappt die Beschreibung nicht aus', env.descriptionClicks(), 0)
  }

  {
    const env = load({ ...YT, aiSummary: true })
    await tick(300)
    s.check('Aktivierte Option klappt zuerst die Beschreibung aus', env.descriptionExpanded(), true)
    s.check('Zusammenfassung wird nicht vor dem Rendering angeklickt', env.summaryClicks(), 0)
    await flush()
    s.check('Aktivierte Option öffnet die native KI-Zusammenfassung', env.summaryExpanded(), true)
    s.check('Zusammenfassung wird nur einmal geöffnet', env.summaryClicks(), 1)
    await flush()
    s.check('Bereits geöffnete Zusammenfassung wird nicht erneut geklickt', env.summaryClicks(), 1)
  }

  {
    const env = load({ hostname: 'example.com', pathname: '/watch', aiSummary: true })
    await flush()
    s.check('Außerhalb von YouTube bleibt die Zusammenfassung unangetastet', env.summaryClicks(), 0)
  }

  {
    const env = load({ hostname: 'www.youtube.com', pathname: '/', aiSummary: true })
    await flush()
    s.check('Außerhalb von Watch-Seiten bleibt die Zusammenfassung unangetastet', env.summaryClicks(), 0)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false })
    await flush()
    s.check('Ohne native Zusammenfassung wird nichts geöffnet', env.summaryClicks(), 0)
    s.check('Zum Prüfen wird die Beschreibung kurz ausgeklappt', env.descriptionExpanded(), true)
    await tick(1100)
    s.check('Ohne native Zusammenfassung wird die Beschreibung wieder geschlossen', env.descriptionExpanded(), false)
    env.mutate()
    await flush()
    s.check('Eine Mutation startet die Prüfung nicht erneut', env.descriptionExpanded(), false)
    s.check('Beschreibung wird nur zum einmaligen Prüfen aus- und eingeklappt', env.descriptionClicks(), 2)
  }

  {
    const env = load({ ...YT, pathname: '/watch?v=new', ownerVideoId: 'old', aiSummary: true, aiSummaryAvailable: false })
    await flush()
    s.check('Veralteter Watch-Container wird nicht für das neue Video benutzt', env.descriptionClicks(), 0)
    env.replaceWatchPage({ videoId: 'new' })
    env.mutate()
    await flush()
    s.check('Nach der Watch-ID-Aktualisierung wird das neue Video geprüft', env.descriptionExpanded(), true)
    s.check('Erst der neue Watch-Container klappt die Beschreibung aus', env.descriptionClicks(), 1)
    await tick(1100)
    s.check('Die Prüfung des neuen Videos wird wieder zurückgeklappt', env.descriptionExpanded(), false)
    s.check('Neues Video wird genau einmal aus- und eingeklappt', env.descriptionClicks(), 2)
  }

  {
    const env = load({ ...YT, pathname: '/watch?v=old', ownerVideoId: 'old', aiSummary: true, aiSummaryAvailable: false })
    await tick(300)
    s.check('Prüfung des ersten Videos startet', env.descriptionExpanded(), true)
    env.navigate('/watch?v=new')
    env.replaceWatchPage({ videoId: 'new', descriptionExpanded: true })
    env.mutate()
    await tick(1300)
    s.check('Alter Prüf-Timer schließt die Beschreibung des neuen Videos nicht', env.descriptionExpanded(), true)
    s.check('Alter Prüf-Timer klickt keine Schaltfläche des neuen Videos', env.descriptionClicks(), 1)
    env.mutate()
    await flush()
    s.check('Neue Watch-Seite bleibt nach ihrer Mutation unverändert', env.descriptionExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false })
    env.mutate()
    await tick(200)
    env.mutate()
    await tick(100)
    s.check('Laufende DOM-Mutationen verschieben die Prüfung nicht', env.descriptionExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false })
    await tick(300)
    env.interactWithDescription('pointerdown')
    await tick(1300)
    s.check('Manuelle Beschreibungsinteraktion verhindert automatisches Rückklappen', env.descriptionExpanded(), true)
    s.check('Nach manueller Interaktion wird kein Schließen angeklickt', env.descriptionClicks(), 1)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false })
    await tick(300)
    env.changeAiSummary(false)
    await flush()
    s.check('Ausschalten während der Prüfung stellt die Beschreibung wieder her', env.descriptionExpanded(), false)
    env.mutate()
    await flush()
    s.check('Nach dem Ausschalten wird nicht erneut geprüft', env.descriptionClicks(), 2)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false, aiSummaryAfterDescriptionExpand: true })
    await flush()
    s.check('Verzögert erzeugte Zusammenfassung löst die Beschreibung aus', env.descriptionExpanded(), true)
    env.mutate()
    await flush()
    s.check('Nach verzögertem Rendering wird die Zusammenfassung geöffnet', env.summaryExpanded(), true)
    await tick(1100)
    s.check('Nach erfolgreichem Öffnen bleibt die Beschreibung ausgeklappt', env.descriptionExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryButton: false })
    await flush()
    s.check('Ohne Zusammenfassungs-Auslöser wird nichts erzwungen', env.summaryClicks(), 0)
    s.check('Ohne Zusammenfassungs-Auslöser bleibt die Beschreibung eingeklappt', env.descriptionClicks(), 0)
  }

  {
    const env = load({ ...YT, aiSummary: false })
    await flush()
    env.changeAiSummary(true)
    await flush()
    s.check('Einschalten der Option greift sofort', env.summaryExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryExpanded: true, descriptionExpanded: true })
    await flush()
    s.check('Bereits offene Zusammenfassung wird nicht erneut geöffnet', env.summaryClicks(), 0)
    env.changeAiSummary(false)
    env.mutate()
    await flush()
    s.check('Ausschalten schließt eine bereits offene Zusammenfassung nicht', env.summaryExpanded(), true)
  }

  {
    const env = load({ ...YT, pathname: '/', aiSummary: true })
    await flush()
    env.navigate('/watch?v=test')
    await flush()
    s.check('Nach SPA-Navigation wird die Zusammenfassung geöffnet', env.summaryExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true, aiSummaryAvailable: false })
    await flush()
    env.setAiSummaryAvailable(true)
    env.mutate()
    await flush()
    s.check('Spät gerenderte Zusammenfassung wird nachgetragen', env.summaryExpanded(), true)
  }

  {
    const env = load({ ...YT, aiSummary: true })
    await flush()
    env.document.querySelector('#video-summary ytd-expandable-metadata-renderer').removeAttribute('is-expanded')
    env.mutate()
    await flush()
    s.check('Manuell geschlossene Zusammenfassung wird wieder geöffnet', env.summaryExpanded(), true)
    s.check('Wiederöffnen erfolgt mit genau einem weiteren Klick', env.summaryClicks(), 2)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
