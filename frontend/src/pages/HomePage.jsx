import React from 'react'
import { Show, SignInButton , UserButton } from '@clerk/react'
import toast from 'react-hot-toast'

function HomePage() {
  
  return (
    <div>
        <button className='btn btn-secondary' onClick={() => toast.success("This is a success toast")}>Click me</button>


        <Show when="signed-out">
            <SignInButton mode="modal">
                <button>Login</button>
            </SignInButton>
        </Show>
        <Show when="signed-in">
            <UserButton />
        </Show>

    </div>
  )
}

export default HomePage
