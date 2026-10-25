import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, validateTopic, resolveTopicId, topicById, AUDIENCES } from '../src/topics/index.js';
import { template } from '../src/topics/_template/index.js';
import { LEVELS } from '../src/ui/level.js';

test('every registered topic satisfies the contract and ids are unique', () => {
  assert.ok(TOPICS.length >= 2);
  const ids = new Set();
  for (const t of TOPICS) {
    assert.deepEqual(validateTopic(t), [], `${t.id} is valid`);
    assert.ok(!ids.has(t.id), `${t.id} is unique`);
    ids.add(t.id);
    assert.ok(t.summary && t.copy.subtitle, `${t.id} has directory copy`);
  }
});

test('topics are ordered and legacy hashes resolve', () => {
  assert.equal(TOPICS[0].id, 'functional-groups');
  assert.equal(TOPICS[1].id, 'mechanisms');
  assert.equal(resolveTopicId('#explorer'), 'functional-groups');
  assert.equal(resolveTopicId('mechanisms'), 'mechanisms');
  assert.equal(resolveTopicId('#no-such-topic'), 'functional-groups');
  assert.equal(resolveTopicId(''), 'functional-groups');
  assert.equal(topicById('nope'), null);
});

test('the template topic is a valid, unregistered canvas topic', () => {
  assert.deepEqual(validateTopic(template), []);
  assert.equal(template.workspace.kind, 'canvas');
  assert.equal(topicById(template.id), null);
});

test('audience levels match the registry vocabulary', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), AUDIENCES);
  assert.deepEqual(validateTopic({ ...template, audiences: ['expert'] }).length, 1);
  assert.ok(validateTopic({ ...template, id: 'Bad Id' }).some((e) => e.includes('kebab-case')));
});
