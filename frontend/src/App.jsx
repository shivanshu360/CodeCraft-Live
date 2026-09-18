import './App.css'
import { Show, SignInButton, UserButton ,SignOutButton} from '@clerk/react'

function App() {
  return (
    <>
      <h1>Welcome to the app</h1>

      <Show when="signed-out">
          <SignInButton mode='modal'>
            <button>Login</button>
          </SignInButton>
      </Show>
      <Show when="signed-in">
          <UserButton />
      </Show>
      <Show when="signed-in">
          <SignOutButton />
      </Show>

    </>
  )
}

export default App
