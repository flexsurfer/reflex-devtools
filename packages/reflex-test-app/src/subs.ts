import { regSub } from "@flexsurfer/reflex";

regSub('users');
regSub('counter');
regSub('isLoading');
regSub('nestedCollections');

function randomBlockingDelay() {
  const delay = Math.floor(Math.random() * 200) + 1;
  const start = Date.now();
  while (Date.now() - start < delay) {
  }
}

regSub('user-by-id',
  (users, id) => {
    randomBlockingDelay();
    return users.find((u: any) => u.id === id);
  }, () => [['users']]
);

regSub('nestedCollections-comp',
  (nestedCollections) => {
    return nestedCollections;
  }, () => [['nestedCollections']]
);