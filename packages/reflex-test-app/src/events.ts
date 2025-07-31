import { regEffect, regEvent } from "@flexsurfer/reflex";

// Event handlers
regEvent('increment-counter', (coeffects) => {
  const { draftDb } = coeffects;
  draftDb.counter = draftDb.counter + 1;
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

regEvent('fake-event', () => {
  return [['fake-effect']];
});

regEffect('fake-effect', () => {
  console.log('fake-effect');
});