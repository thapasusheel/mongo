/**
 * Tests bulk write command for scenarios that cause the command to fail (ok: 0) and where our
 * behavior differs depending on whether auth is enabled.
 *
 * These tests are incompatible with the transaction overrides since any failure
 * will cause a transaction abortion which will make the overrides infinite loop.
 *
 * The test runs commands that are not allowed with security token: bulkWrite.
 * @tags: [
 *   not_allowed_with_security_token,
 *   command_not_supported_in_serverless,
 *   # Contains commands that fail which will fail the entire transaction
 *   does_not_support_transactions,
 *   # TODO SERVER-52419 Remove this tag.
 *   featureFlagBulkWriteCommand,
 * ]
 */
import {cursorEntryValidator} from "jstests/libs/bulk_write_utils.js";

const coll = db.getCollection("coll");
coll.drop();

// Test update fails userAllowedWriteNS.
let res = db.adminCommand({
    bulkWrite: 1,
    ops: [
        {
            update: 0,
            filter: {_id: 1},
            updateMods: {$set: {skey: "MongoDB2"}},
        },
    ],
    nsInfo: [{ns: "test.system.profile"}]
});

assert.commandWorked(res);
assert.eq(res.numErrors, 1);

cursorEntryValidator(res.cursor.firstBatch[0],
                     {ok: 0, idx: 0, n: 0, nModified: 0, code: ErrorCodes.InvalidNamespace});
assert(!res.cursor.firstBatch[1]);

// Test delete fails userAllowedWriteNS.
res = db.adminCommand({
    bulkWrite: 1,
    ops: [
        {
            delete: 0,
            filter: {_id: 1},
        },
    ],
    nsInfo: [{ns: "test.system.profile"}]
});

assert.commandWorked(res);
assert.eq(res.numErrors, 1);

cursorEntryValidator(res.cursor.firstBatch[0],
                     {ok: 0, idx: 0, n: 0, code: ErrorCodes.InvalidNamespace});
assert(!res.cursor.firstBatch[1]);

// Test delete continues on error with ordered:false.
coll.insert({_id: 1, skey: "MongoDB"});
res = db.adminCommand({
    bulkWrite: 1,
    ops: [
        {
            delete: 0,
            filter: {_id: 0},
        },
        {delete: 1, filter: {_id: 1}}
    ],
    nsInfo: [{ns: "test.system.profile"}, {ns: "test.coll"}],
    ordered: false
});

assert.commandWorked(res);
assert.eq(res.numErrors, 1);

cursorEntryValidator(res.cursor.firstBatch[0],
                     {ok: 0, idx: 0, n: 0, code: ErrorCodes.InvalidNamespace});
cursorEntryValidator(res.cursor.firstBatch[1], {ok: 1, idx: 1, n: 1});
assert(!res.cursor.firstBatch[2]);

assert(!coll.findOne());

coll.drop();

// Test delete stop on error with ordered:true.
coll.insert({_id: 1, skey: "MongoDB"});
res = db.adminCommand({
    bulkWrite: 1,
    ops: [
        {
            delete: 0,
            filter: {_id: 0},
        },
        {delete: 1, filter: {_id: 1}},
        {insert: 0, document: {_id: 1, skey: "MongoDB"}},
    ],
    nsInfo: [{ns: "test.system.profile"}, {ns: "test.coll"}],
});

assert.commandWorked(res);
assert.eq(res.numErrors, 1);

cursorEntryValidator(res.cursor.firstBatch[0],
                     {ok: 0, idx: 0, n: 0, code: ErrorCodes.InvalidNamespace});
assert(!res.cursor.firstBatch[1]);

assert.eq(coll.findOne().skey, "MongoDB");

coll.drop();

// Test that we correctly count multiple errors for different write types when ordered=false.
res = db.adminCommand({
    bulkWrite: 1,
    ops: [
        {insert: 0, document: {_id: 1}},
        {insert: 0, document: {_id: 2}},
        // error 1: duplicate key error
        {insert: 0, document: {_id: 1}},
        {delete: 0, filter: {_id: 2}},
        // error 2: user can't write to namespace
        {delete: 1, filter: {_id: 0}},
        {update: 0, filter: {_id: 0}, updateMods: {$set: {x: 1}}},
        // error 3: invalid update operator
        {update: 0, filter: {_id: 0}, updateMods: {$blah: {x: 1}}},
    ],
    nsInfo: [{ns: "test.coll"}, {ns: "test.system.profile"}],
    ordered: false
});

assert.commandWorked(res);
assert.eq(res.numErrors, 3);
coll.drop();
