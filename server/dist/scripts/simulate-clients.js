"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const agla_station_shared_1 = require("agla-station-shared");
const SERVER_URL = 'http://localhost:4000';
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function runSimulation() {
    console.log('🚀 Starting aglaStation Phase 1 simulation test...\n');
    // Client 1 connects
    console.log('--- Step 1: Client 1 connecting and joining room (yellow:up) ---');
    const client1 = (0, socket_io_client_1.io)(SERVER_URL, { reconnection: false });
    await new Promise((resolve) => client1.on('connect', () => resolve()));
    console.log(`✅ Client 1 connected: ${client1.id}`);
    // Test Time Ping/Pong
    const t0 = Date.now();
    let serverOffset1 = 0;
    client1.emit(agla_station_shared_1.SOCKET_EVENTS.TIME_PING, { clientSendTime: t0 });
    await new Promise((resolve) => {
        client1.on(agla_station_shared_1.SOCKET_EVENTS.TIME_PONG, (pong) => {
            const t1 = Date.now();
            const rtt = t1 - pong.clientSendTime;
            serverOffset1 = pong.serverTime + rtt / 2 - t1;
            console.log(`⏱ Client 1 NTP sync: RTT = ${rtt}ms, Clock Offset = ${serverOffset1}ms`);
            resolve();
        });
    });
    const client1StatePromise = new Promise((resolve) => {
        client1.on(agla_station_shared_1.SOCKET_EVENTS.ROOM_STATE, (state) => {
            console.log(`📥 Client 1 received ROOM_STATE:`, {
                roomId: state.room.roomId,
                stationIndex: state.stationIndex,
                stationName: state.currentStation.name,
                trackTitle: state.track.title,
                trackSource: state.track.sourceId,
                startedAt: state.startedAt,
                serverTime: state.serverTime,
            });
            resolve(state);
        });
    });
    client1.emit(agla_station_shared_1.SOCKET_EVENTS.ROOM_JOIN, {
        lineId: 'yellow',
        direction: 'up',
        startStationId: 'samaypur-badli',
        destStationId: 'rajiv-chowk',
        name: 'Rider Alpha',
    });
    const s1 = await client1StatePromise;
    // Wait 3 seconds to let some time elapse on the track
    console.log('\n⏳ Waiting 3 seconds before Client 2 joins...');
    await wait(3000);
    // Client 2 connects (Late Joiner)
    console.log('\n--- Step 2: Client 2 connecting as late joiner ---');
    const client2 = (0, socket_io_client_1.io)(SERVER_URL, { reconnection: false });
    await new Promise((resolve) => client2.on('connect', () => resolve()));
    console.log(`✅ Client 2 connected: ${client2.id}`);
    const client2StatePromise = new Promise((resolve) => {
        client2.on(agla_station_shared_1.SOCKET_EVENTS.ROOM_STATE, (state) => {
            console.log(`📥 Client 2 received ROOM_STATE:`, {
                roomId: state.room.roomId,
                stationIndex: state.stationIndex,
                stationName: state.currentStation.name,
                trackTitle: state.track.title,
                startedAt: state.startedAt,
                serverTime: state.serverTime,
            });
            resolve(state);
        });
    });
    client2.emit(agla_station_shared_1.SOCKET_EVENTS.ROOM_JOIN, {
        lineId: 'yellow',
        direction: 'up',
        startStationId: 'vishwa-vidyalaya',
        destStationId: 'central-secretariat',
        name: 'Rider Beta',
    });
    const s2 = await client2StatePromise;
    // Verify sync math between Client 1 and Client 2
    console.log('\n--- Step 3: Verifying Late-Joiner Elapsed Sync Math ---');
    console.log(`Client 1 startedAt: ${s1.startedAt}`);
    console.log(`Client 2 startedAt: ${s2.startedAt}`);
    const elapsedOnJoin2 = (s2.serverTime - s2.startedAt) / 1000;
    console.log(`Client 2 elapsed track position on join: ${elapsedOnJoin2.toFixed(2)} seconds`);
    if (s1.startedAt === s2.startedAt && elapsedOnJoin2 >= 2.5) {
        console.log('✅ PASS: Late joiner shares the exact startedAt epoch and calculated ~3s elapsed offset!');
    }
    else {
        console.error('❌ FAIL: startedAt mismatch or elapsed time discrepancy.');
        process.exit(1);
    }
    // Step 4: Advance Station
    console.log('\n--- Step 4: Triggering station advancement ---');
    const client1AdvancePromise = new Promise((resolve) => {
        client1.on(agla_station_shared_1.SOCKET_EVENTS.STATION_ADVANCE, (advance) => {
            console.log(`📢 Client 1 received STATION_ADVANCE: Now at "${advance.currentStation.name}", Next: "${advance.nextStation?.name}"`);
            resolve(advance);
        });
    });
    const client2AdvancePromise = new Promise((resolve) => {
        client2.on(agla_station_shared_1.SOCKET_EVENTS.STATION_ADVANCE, (advance) => {
            console.log(`📢 Client 2 received STATION_ADVANCE: Now at "${advance.currentStation.name}", Next: "${advance.nextStation?.name}"`);
            resolve(advance);
        });
    });
    // Client 1 triggers manual advance
    client1.emit(agla_station_shared_1.SOCKET_EVENTS.STATION_ADVANCE_MANUAL);
    const [adv1, adv2] = await Promise.all([client1AdvancePromise, client2AdvancePromise]);
    if (adv1.stationIndex === adv2.stationIndex && adv1.startedAt === adv2.startedAt && adv1.stationIndex === 1) {
        console.log('✅ PASS: Both clients received identical STATION_ADVANCE with updated track and startedAt!');
    }
    else {
        console.error('❌ FAIL: Station advance mismatch between clients.');
        process.exit(1);
    }
    // Clean up
    client1.disconnect();
    client2.disconnect();
    console.log('\n🎉 ALL PHASE 1 SIMULATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
}
runSimulation().catch((err) => {
    console.error('Simulation error:', err);
    process.exit(1);
});
