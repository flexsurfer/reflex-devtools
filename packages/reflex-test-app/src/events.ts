import { regEffect, regEvent, NOW } from "@flexsurfer/reflex";

// Event handlers
regEvent('increment-counter', (coeffects) => {
  const { draftDb } = coeffects;
  draftDb.counter = draftDb.counter + 1;
  draftDb.field1 = {};
  draftDb.field1.field2 = "test";
  draftDb.field1.field4 = {};
  draftDb.field1.field4.field3 = "test2";
});

regEvent('toggle-user', (coeffects, userId: number) => {
  const { draftDb } = coeffects;
  const user = draftDb.users.find((u: any) => u.id === userId);
  if (user) {
    user.active = !user.active;
  }
});

regEvent('set-loading', (coeffects, isLoading: boolean) => {
  const { draftDb } = coeffects;
  draftDb.isLoading = isLoading;
  return [['fake-effect']];
});

regEvent('add-user', (coeffects, newUser: any) => {
  const { draftDb } = coeffects;
  draftDb.users.push(newUser);
});

regEvent('simulate-error', () => {
  throw new Error('This is a simulated error for testing');
});

regEvent('fake-event', ({now}) => {
  return [['fake-effect', now]];
}, [[NOW]]);

regEvent('test-event-with-bad-params', ({draftDb}, badPayload: any) => {
  draftDb.badPayload = badPayload;
});

regEvent('test-event-with-immer-proxy', ({draftDb}) => {
  return [['fake-effect', draftDb.immerPayloadTest]];
});

regEffect('fake-effect', (param) => {
  console.log('fake-effect', param);
});