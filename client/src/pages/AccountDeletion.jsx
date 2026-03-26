import React from 'react';
import { Link } from 'react-router-dom';
import logo from './../assets/logo1.png';

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-white p-9">
      <Link to='/'>
        <div className="sm:text-[1.2rem] cursor-pointer">
          <h1 className="flex items-center">
            <img className="mr-3 w-10 inline-block brightness-150" src={logo} alt="Logo" />
            <strong><span className="text-black">GCES </span><span className="text-blue-400">BLOOD LINE</span></strong>
          </h1>
        </div>
      </Link>

      <div className="min-h-screen bg-gray-900 text-white p-6 sm:p-12 rounded-lg mt-7">
        <div className="max-w-4xl mx-auto space-y-5 bg-gray-800/80 border border-gray-700 rounded-lg p-6 sm:p-10 shadow-lg text-gray-300">
          <div className="privacy-content [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-4 [&>p]:mb-4 [&_a]:text-blue-400 [&_a]:hover:underline">
            <h1>Account Deletion</h1>
            <p>If you would like to request the permanent deletion of your GCES Bloodline account, please follow the instructions below.</p>

            <h2>How to request Account Deletion</h2>
            <p>Send an email to our support team at <a href="mailto:bloodline.gces@gmail.com">bloodline.gces@gmail.com</a> from the email address associated with your account.</p>

            <p>Please use the subject line <strong>"Account Deletion Request"</strong>. In the body of the email, kindly provide your name and state explicitly that you wish for your account to be permanently deleted.</p>

            <p>Once we receive your request, our team will process it and delete your account from our servers. We will ensure your request is handled promptly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
