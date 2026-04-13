import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Building2,
  MessageSquare,
  Send,
  HeartHandshake,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
  }),
};

const ContactCard = ({ icon: Icon, label, value, href, delay }) => (
  <motion.a
    href={href || '#'}
    target={href ? '_blank' : '_self'}
    rel="noreferrer"
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    custom={delay}
    whileHover={{ scale: 1.03, y: -4 }}
    className="group flex items-start gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 rounded-2xl p-5 transition-all duration-300 cursor-pointer no-underline"
  >
    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-600/20 group-hover:bg-red-600/30 flex items-center justify-center transition-all duration-300">
      <Icon className="w-5 h-5 text-red-400" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white font-semibold text-sm leading-relaxed">{value}</p>
    </div>
    <ChevronRight className="ml-auto flex-shrink-0 w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all duration-300 mt-1" />
  </motion.a>
);

const ContactAndSupport = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder submit logic
    setSent(true);
    setForm({ name: '', email: '', message: '' });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-red-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-5">
            <HeartHandshake className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300 font-semibold uppercase tracking-widest">Contact & Support</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Get in{' '}
            <span className="bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Have a question or need support? Reach out to the GCES Bloodline team — we're here to help.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — Contact Info */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* College card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm leading-tight">Government College of</h2>
                  <h2 className="text-white font-bold text-sm leading-tight">Engineering Srirangam</h2>
                </div>
              </div>
              <div className="h-px bg-white/10 mb-4" />
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Trichy-Madurai Highway, Sethurappatti Road, Trichy – 620012, Tamil Nadu.</span>
              </div>
            </motion.div>

            {/* Contact links */}
            <ContactCard
              icon={Phone}
              label="Office"
              value="+91 94880 08656"
              href="tel:+919488008656"
              delay={1}
            />
            <ContactCard
              icon={Phone}
              label="Hostel"
              value="+91 94880 91653"
              href="tel:+919488091653"
              delay={2}
            />
            <ContactCard
              icon={Mail}
              label="Principal"
              value="principle@gces.edu.in"
              href="mailto:principle@gces.edu.in"
              delay={3}
            />
            <ContactCard
              icon={Mail}
              label="General"
              value="gcesrirangam@gmail.com"
              href="mailto:gcesrirangam@gmail.com"
              delay={4}
            />

            {/* Office hours */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={5}
              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="w-11 h-11 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">Office Hours</p>
                <p className="text-white font-semibold text-sm">Mon – Fri &nbsp;·&nbsp; 9:00 AM – 5:00 PM</p>
              </div>
            </motion.div>
          </div>

          {/* Right — Message Form */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Send a Message</h2>
                <p className="text-slate-400 text-xs">We'll get back to you shortly</p>
              </div>
            </div>

            {sent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm font-medium text-center"
              >
                ✅ Message sent! We'll reach out soon.
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-widest" htmlFor="cs-name">
                    Your Name
                  </label>
                  <input
                    id="cs-name"
                    type="text"
                    required
                    placeholder="e.g. Arjun Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-white/5 border border-white/10 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-widest" htmlFor="cs-email">
                    Email Address
                  </label>
                  <input
                    id="cs-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-white/5 border border-white/10 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-widest" htmlFor="cs-message">
                  Message
                </label>
                <textarea
                  id="cs-message"
                  required
                  rows={6}
                  placeholder="Describe your issue or question..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-white/5 border border-white/10 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 resize-none flex-1"
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-red-900/30"
              >
                <Send className="w-4 h-4" />
                Send Message
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={2}
          className="text-center text-slate-500 text-xs mt-12"
        >
          GCES Bloodline · Government College of Engineering Srirangam · Trichy, Tamil Nadu
        </motion.p>
      </div>
    </div>
  );
};

export default ContactAndSupport;