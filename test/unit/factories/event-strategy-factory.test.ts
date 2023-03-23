import { expect } from 'chai'
import { beforeEach, describe, it } from 'jest'

import { IWebSocketAdapter } from '../../../src/@types/adapters.ts'
import { Factory } from '../../../src/@types/base.ts'
import { Event } from '../../../src/@types/event.ts'
import { IEventStrategy } from '../../../src/@types/message-handlers.ts'
import { IEventRepository } from '../../../src/@types/repositories.ts'
import { EventKinds } from '../../../src/constants/base.ts'
import { eventStrategyFactory } from '../../../src/factories/event-strategy-factory.ts'
import { DefaultEventStrategy } from '../../../src/handlers/event-strategies/default-event-strategy.ts'
import { DeleteEventStrategy } from '../../../src/handlers/event-strategies/delete-event-strategy.ts'
import { EphemeralEventStrategy } from '../../../src/handlers/event-strategies/ephemeral-event-strategy.ts'
import { ParameterizedReplaceableEventStrategy } from '../../../src/handlers/event-strategies/parameterized-replaceable-event-strategy.ts'
import { ReplaceableEventStrategy } from '../../../src/handlers/event-strategies/replaceable-event-strategy.ts'

describe('eventStrategyFactory', () => {
    let eventRepository: IEventRepository
    let event: Event
    let adapter: IWebSocketAdapter
    let factory: Factory<
        IEventStrategy<Event, Promise<void>>,
        [Event, IWebSocketAdapter]
    >

    beforeEach(() => {
        eventRepository = {} as any
        event = {} as any
        adapter = {} as any

        factory = eventStrategyFactory(eventRepository)
    })

    it('returns ReplaceableEvent given a set_metadata event', () => {
        event.kind = EventKinds.SET_METADATA
        expect(factory([event, adapter])).to.be.an.instanceOf(
            ReplaceableEventStrategy,
        )
    })

    it('returns ReplaceableEvent given a contact_list event', () => {
        event.kind = EventKinds.CONTACT_LIST
        expect(factory([event, adapter])).to.be.an.instanceOf(
            ReplaceableEventStrategy,
        )
    })

    it('returns ReplaceableEvent given a replaceable event', () => {
        event.kind = EventKinds.REPLACEABLE_FIRST
        expect(factory([event, adapter])).to.be.an.instanceOf(
            ReplaceableEventStrategy,
        )
    })

    it('returns EphemeralEventStrategy given an ephemeral event', () => {
        event.kind = EventKinds.EPHEMERAL_FIRST
        expect(factory([event, adapter])).to.be.an.instanceOf(
            EphemeralEventStrategy,
        )
    })

    it('returns DeleteEventStrategy given a delete event', () => {
        event.kind = EventKinds.DELETE
        expect(factory([event, adapter])).to.be.an.instanceOf(DeleteEventStrategy)
    })

    it('returns ParameterizedReplaceableEventStrategy given a delete event', () => {
        event.kind = EventKinds.PARAMETERIZED_REPLACEABLE_FIRST
        expect(factory([event, adapter])).to.be.an.instanceOf(
            ParameterizedReplaceableEventStrategy,
        )
    })

    it('returns DefaultEventStrategy given a text_note event', () => {
        event.kind = EventKinds.TEXT_NOTE
        expect(factory([event, adapter])).to.be.an.instanceOf(DefaultEventStrategy)
    })
})
