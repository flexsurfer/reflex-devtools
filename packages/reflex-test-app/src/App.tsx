import { useCallback } from 'react';
import { dispatch, useSubscription } from '@flexsurfer/reflex';
import './App.css';
import UserItem from './components/UserItem';

function App() {

  const users = useSubscription<any>(['users'], "App");
  const counter = useSubscription<any>(['counter'], "App");
  const isLoading = useSubscription<any>(['isLoading'], "App");
  const nestedCollections = useSubscription<any>(['nestedCollections-comp'], "App");

  const handleCounterIncrement = useCallback(() => {dispatch(['increment-counter']);}, []);

  const handleUserToggle = useCallback((userId: number) => {dispatch(['toggle-user', userId]);}, []);

  const simulateApiCall = async () => {
    dispatch(['set-loading', true]);
    dispatch(['fake-event', 2, { name: 'John Doe' }]);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newUser = {
        id: users.length + 1,
        name: `User ${users.length + 1}`,
        active: Math.random() > 0.5
      };

      dispatch(['add-user', newUser]);

    } catch (error) {
    } finally {
      dispatch(['set-loading', false]);
    }
  };

  const simulateError = () => {
    try {
      dispatch(['simulate-error']);
    } catch (error) {
    }
  };

  const dispatchTestEventWithBadParams = () => {

    // Try to create a simple proxy for testing
    const proxyTarget = { original: 'value' };
    const proxy = new Proxy(proxyTarget, {
      get(target, prop) {
        return target[prop as keyof typeof target];
      }
    });

    // Create problematic payload
    const badPayload: any = {
      function: () => console.log('test function'),
      symbol: Symbol('test symbol'),
      undefined: undefined,
      bigint: 123n,
      map: new Map([['key1', 'value1'], ['key2', 'value2']]),
      set: new Set([1, 2, 3, 3]),
      weakMap: new WeakMap(),
      weakSet: new WeakSet(),
      regexp: /test/gi,
      date: new Date(),
      error: new Error('Test error'),
      proxy: proxy,
      nested: {
        deep: {
          function: function() { return 'nested function'; },
          symbol: Symbol('nested symbol'),
          undefined: undefined,
        }
      }
    };

    dispatch(['test-event-with-bad-params', badPayload]);
  };

  // Map and Set testing functions
  const addUserToMap = () => {
    const userId = `user-${Date.now()}`;
    const userData = {
      id: Date.now(),
      name: `Dynamic User ${Math.floor(Math.random() * 1000)}`,
      role: ['admin', 'user', 'moderator'][Math.floor(Math.random() * 3)]
    };
    dispatch(['add-user-to-map', userId, userData]);
  };

  const updateUserInMap = () => {
    dispatch(['update-user-in-map', 'user-1', { role: 'super-admin' }]);
  };

  const addPermission = () => {
    const permissions = ['execute', 'manage', 'share', 'export'];
    const randomPermission = permissions[Math.floor(Math.random() * permissions.length)];
    dispatch(['add-permission', randomPermission]);
  };

  const toggleUserRole = () => {
    const roles = ['admin', 'user', 'guest'];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    dispatch(['toggle-user-role', 'alice', randomRole]);
  };

  const createComplexStructure = () => {
    dispatch(['create-complex-map-set-structure']);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Reflex Devtools Example</h1>
        <p>This app demonstrates using the Reflex library with trace integration to send events to the Reflex Devtools dashboard.</p>
        <p>
          Open <a href="http://localhost:4000" target="_blank" rel="noopener noreferrer">
            http://localhost:4000
          </a> to view the devtools dashboard.
        </p>
      </header>

      <main className="app-main">
        <section className="counter-section">
          <h2>Counter Component (Reflex)</h2>
          <div className="counter">
            <button onClick={handleCounterIncrement} className="counter-button">
              Count: {counter}
            </button>
          </div>
        </section>

        <section className="users-section">
          <h2>User List Component (Reflex)</h2>
          <div className="users-list">
            {users?.map((user: any) => (
              <UserItem
                key={user.id}
                userId={user.id}
                onToggle={handleUserToggle}
              />
            )) || []}
          </div>
        </section>

        <section className="actions-section">
          <h2>Test Actions</h2>
          <div className="action-buttons">
            <button
              onClick={simulateApiCall}
              disabled={isLoading}
              className="api-button"
            >
              {isLoading ? 'Loading...' : 'Simulate API Call'}
            </button>
            <button
              onClick={simulateError}
              className="error-button"
            >
              Trigger Error
            </button>
            <button
              onClick={dispatchTestEventWithBadParams}
              className="test-button"
            >
              Test Bad Params
            </button>

            <button
              onClick={() => {
                dispatch(['test-event-with-immer-proxy']);
              }}
              className="test-button"
            >
              Test Immer Proxy
            </button>
          </div>
        </section>

        <section className="maps-sets-section">
          <h2>🗺️ Map & Set Testing</h2>
          <p>Test the Map and Set serialization/deserialization functionality</p>
          <div className="action-buttons">
            <button
              onClick={addUserToMap}
              className="map-button"
            >
              Add User to Map
            </button>
            <button
              onClick={updateUserInMap}
              className="map-button"
            >
              Update User in Map
            </button>
            <button
              onClick={addPermission}
              className="set-button"
            >
              Add Random Permission
            </button>
            <button
              onClick={toggleUserRole}
              className="set-button"
            >
              Toggle User Role
            </button>
            <button
              onClick={createComplexStructure}
              className="complex-button"
            >
              Create Complex Structure
            </button>
            <button
              onClick={() => dispatch(['remove-user-from-map', 'user-2'])}
              className="map-button"
            >
              Remove User from Map
            </button>
            <button
              onClick={() => dispatch(['remove-permission', 'read'])}
              className="set-button"
            >
              Remove Permission
            </button>
          </div>
        </section>

        <section className="nested-collections-section">
          <h2>🔗 Nested Collections</h2>
          <p>View the nested collections data structure with Maps and Sets</p>
          <div className="nested-collections-display">
            <div className="collection-item">
              <h3>Roles Map</h3>
              {nestedCollections?.rolesMap && (
                <div className="roles-map">
                  {(Array.from(nestedCollections.rolesMap.entries()) as [string, Set<string>][]).map(([role, permissions]) => (
                    <div key={role} className="role-item">
                      <strong>{role}:</strong> [{Array.from(permissions).join(', ')}]
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="collection-item">
              <h3>User Permissions</h3>
              {nestedCollections?.userPermissions && (
                <div className="user-permissions">
                  {(Array.from(nestedCollections.userPermissions.entries()) as [string, Set<string>][]).map(([user, permissions]) => (
                    <div key={user} className="user-item">
                      <strong>{user}:</strong> [{Array.from(permissions).join(', ')}]
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>How to Use</h2>
          <ol>
            <li>Start the devtools server: <code>npx reflex-devtools</code></li>
            <li>Open the dashboard at <code>http://localhost:4000</code></li>
            <li>Interact with the components above to see both user events and Reflex traces in the dashboard</li>
            <li>Test Map and Set serialization by clicking the buttons in the "Map & Set Testing" section</li>
            <li>Watch the "Current Data State" section update in real-time as you manipulate the data</li>
            <li>Use the filter in the dashboard to find specific events or traces</li>
            <li>Look for <code>reflex-trace</code> events to see internal Reflex operations</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

export default App; 