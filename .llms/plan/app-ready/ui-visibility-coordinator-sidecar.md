# UI Visibility Coordinator — sidecar spec

Statut: draft vivant

But: capturer uniquement les points validés dans la conversation, pour itération incrémentale.

## 1. Vocabulaire validé

- **Coordinator**: source de vérité centrale qui pilote les runs visuels.
- **Scenario**: recette déclarative de coordination visuelle.
  - exemples: `appBoot`, `threadSwitch`
- **Run**: exécution concrète d’un scenario.
  - un nouveau run préempte toujours le précédent
- **Ticket**: demande courante émise par le coordinator pour un checkpoint donné.
  - le ticket est interne; l’API ergonomique ne l’expose pas forcément
- **Checkpoint**: signal de readiness attendu par un run.
  - exemples: `sidebarReady`, `activeThreadReady`
- **Surface**: zone visuelle pilotée par le coordinator.
  - exemples: `sidebar`, `threadPane`
- **Participant**: composant qui peut satisfaire un checkpoint.
- **Subject key**: identité logique du sujet attendu par un run.
  - exemple: `threadId` pour `threadSwitch`
- **Motion spec**: paramètres visuels de transition.
  - durée, delay, easing, etc.

## 2. Modèle validé

Le système est un **coordinator transactionnel de visibilité UI**, avec les propriétés suivantes:

- un seul run actif à la fois
- **last run wins**
- démarrer un nouveau run annule immédiatement l’ancien
- tous les événements tardifs de l’ancien run sont ignorés
- le coordinator pilote uniquement du **visuel UI**, pas de logique métier

## 3. Invariants validés

- **Single active run**: un seul run actif à la fois.
- **Total preemption**: tout nouveau run annule immédiatement le précédent.
- **Ignore stale events**: tout signal lié à un ancien run est ignoré.
- **Checkpoint idempotent**: acker deux fois le même ticket ne change rien après le premier ack.
- **Immediate visual baseline**: au démarrage d’un run, les surfaces ciblées passent immédiatement dans leur état visuel initial.
- **Coordinator-authoritative**: l’identité de tentative appartient au coordinator, jamais au composant.

## 4. Distinction conceptuelle validée

Il faut distinguer deux dimensions:

- **subjectKey**: qui est attendu (`threadId`)
- **ticket/run identity**: quelle tentative est en cours

Cette distinction reste nécessaire pour gérer correctement le cas:

`A -> B -> A`

Même si l’API publique n’expose qu’un ticket opaque.

## 5. Décision validée sur les race conditions et les composants préchargés

Décision: **on ne freeze jamais un cycle/run ID au mount d’un hook participant**.

À la place:

- le coordinator émet des tickets en interne
- le participant observe la demande courante qui le concerne
- si le participant est déjà prêt, il peut ré-acker immédiatement un nouveau ticket
- si le participant n’est pas encore prêt, il ackera plus tard quand sa readiness locale passera à true

Conséquence importante:

- un composant préchargé et jamais unmounted reste compatible
- aucun remount n’est requis pour ré-acker un nouveau run

## 6. Readiness locale validée

La readiness côté participant doit être pensée comme un **état local latché/sticky**, pas uniquement comme un événement one-shot.

Raison:

- si un composant devient prêt avant qu’un ticket pertinent n’arrive,
- il doit quand même pouvoir ack instantanément ce ticket quand il apparaît.

Bridge interne du hook:

`matchingTicket && localReady => ack`

Ce bridge reste interne à l’abstraction, pas à réécrire partout dans les composants.

## 7. Scenarios validés

### `appBoot`

But: révéler l’app de façon synchronisée au premier chargement.

Surfaces ciblées:
- `sidebar`
- `threadPane`

Checkpoints attendus:
- `sidebarReady`
- `activeThreadReady`

État initial:
- `sidebar` cachée
- `threadPane` caché

Condition de reveal:
- tous les checkpoints requis ont été ackés

Politique de préemption:
- un `threadSwitch` lancé pendant `appBoot` annule immédiatement `appBoot`

### `threadSwitch(subjectKey = threadId)`

But: masquer le contenu courant, préparer la conversation cible, puis la révéler.

Surface ciblée:
- `threadPane`

Checkpoint attendu:
- `activeThreadReady`

État initial:
- `threadPane` caché

Condition de reveal:
- le checkpoint attendu pour le thread ciblé a été acké

Politique de préemption:
- tout nouveau `threadSwitch` annule immédiatement le précédent

## 8. API participant validée

Décision validée: supporter **les deux modes**.

### 8.1 Mode impératif

Quand le composant a déjà un callback naturel de type `onReady`.

```ts
const { markReady } = useCheckpointParticipant({
  checkpoint: "activeThreadReady",
  subjectKey: threadId,
})
```

Puis:

```ts
markReady()
```

### 8.2 Mode déclaratif

Quand la readiness existe déjà sous forme de booléen.

```ts
useCheckpointParticipantReady({
  checkpoint: "activeThreadReady",
  subjectKey: threadId,
  isReady: isConversationStable,
})
```

## 9. Exemples validés d’usage

### 9.1 Conversation avec `subjectKey` + callback impératif

```ts
function ThreadActivity({ threadId }: { threadId: string }) {
  const { markReady } = useCheckpointParticipant({
    checkpoint: "activeThreadReady",
    subjectKey: threadId,
  })

  return <ThreadView threadId={threadId} onReady={markReady} />
}
```

### 9.2 Conversation avec `subjectKey` + booléen `isReady`

```ts
function ThreadActivity({ threadId }: { threadId: string }) {
  const isConversationStable =
    messagesReady && layoutReady && editorReady

  useCheckpointParticipantReady({
    checkpoint: "activeThreadReady",
    subjectKey: threadId,
    isReady: isConversationStable,
  })

  return <ThreadView threadId={threadId} />
}
```

### 9.3 Sidebar sans `subjectKey` + callback impératif

```ts
function Sidebar() {
  const { markReady } = useCheckpointParticipant({
    checkpoint: "sidebarReady",
  })

  return <SidebarView onReady={markReady} />
}
```

### 9.4 Sidebar sans `subjectKey` + booléen `isReady`

```ts
function Sidebar() {
  useCheckpointParticipantReady({
    checkpoint: "sidebarReady",
    isReady: isSidebarStable,
  })

  return <SidebarView />
}
```

## 10. Shape conceptuelle minimale conservée

### Coordinator

- connaît le run actif
- connaît le scenario actif
- connaît le `subjectKey` attendu si applicable
- connaît les checkpoints encore attendus
- émet les tickets internes

### Participant

- connaît son `checkpoint`
- connaît éventuellement son `subjectKey`
- connaît sa readiness locale
- ack le ticket courant pertinent via l’abstraction du hook

## 11. Points explicitement laissés ouverts

À discuter ensuite:

- forme exacte du store du coordinator
- phase model exact (`waiting`, `revealing`, `settled`, etc.)
- shape exacte du `SurfaceIntent`
- stratégie de motion (`duration 0` si ready rapide, sinon reveal animé)
- faut-il un `resetReady()` dans l’API participant
- faut-il un timeout de sécurité / fail-open
- overlay: surface dédiée ou simple dérivé de `threadPane`

## 12. Règle éditoriale de ce document

Ce document ne doit contenir que:

- les décisions validées explicitement
- les points ouverts clairement marqués comme ouverts
- les exemples d’API déjà approuvés

