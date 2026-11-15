// ==========================================
// CENTRALA GŁOSU (host): każdy gość łączy się głosowo tylko z hostem, a host dla każdego gościa miksuje w jeden strumień głosy
// wszystkich pozostałych (hosta i innych gości, bez jego własnego głosu). Dzięki temu wszyscy słyszą wszystkich wszędzie tam,
// gdzie działa połączenie gość-host (wcześniej goście łączyli się też bezpośrednio ze sobą, a taka para potrafiła nie zestawić
// dźwięku, przez co działał tylko głos hosta). Wyciszenie gracza działa po stronie hosta: gain źródła w mikserze tego słuchacza.
// Moduł nie zna sieci ani PeerJS: dostaje AudioContext i strumienie, oddaje strumień do call.answer().
// ==========================================
export function createVoiceHub(ac) {
    const mixes = {};    // słuchacz -> { dst, gains: { źródło -> GainNode } }
    const sources = {};  // źródło -> MediaStreamAudioSourceNode
    const muted = {};    // słuchacz -> Set(źródeł wyciszonych przez niego)
    const gainFor = (listener, source) => (muted[listener] && muted[listener].has(source)) ? 0 : 1;
    function connect(listener, source) {
        const mix = mixes[listener], node = sources[source];
        if (!mix || !node || listener === source || mix.gains[source]) return;
        const g = ac.createGain(); g.gain.value = gainFor(listener, source);
        node.connect(g); g.connect(mix.dst); mix.gains[source] = g;
    }
    return {
        // Dodaje źródło (strumień hosta albo gościa); od teraz słyszą je wszyscy słuchacze poza nim samym
        addSource(id, stream) {
            if (!stream || sources[id]) return;
            try { sources[id] = ac.createMediaStreamSource(stream); } catch (e) { return; }
            for (const l in mixes) connect(l, id);
        },
        removeSource(id) {
            if (sources[id]) { try { sources[id].disconnect(); } catch (e) {} delete sources[id]; }
            for (const l in mixes) { const g = mixes[l].gains[id]; if (g) { try { g.disconnect(); } catch (e) {} delete mixes[l].gains[id]; } }
        },
        // Strumień dla słuchacza (to, co dostaje w call.answer): miks wszystkich źródeł poza jego własnym
        mixFor(listener) {
            if (!mixes[listener]) { mixes[listener] = { dst: ac.createMediaStreamDestination(), gains: {} }; for (const s in sources) connect(listener, s); }
            return mixes[listener].dst.stream;
        },
        removeListener(id) {
            const m = mixes[id]; if (m) { for (const s in m.gains) { try { m.gains[s].disconnect(); } catch (e) {} } delete mixes[id]; }
            delete muted[id]; this.removeSource(id);
        },
        setMuted(listener, source, on) {
            (muted[listener] = muted[listener] || new Set())[on ? 'add' : 'delete'](source);
            const g = mixes[listener] && mixes[listener].gains[source]; if (g) g.gain.value = on ? 0 : 1;
        },
        info() { return { listeners: Object.keys(mixes), sources: Object.keys(sources) }; }
    };
}
