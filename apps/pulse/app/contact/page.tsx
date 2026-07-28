import React from 'react';
import ContactForm from '@/components/ContactForm';
import { Mail, Phone, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | Sunset Pulse',
  description: 'Get in touch with the Sunset Pulse team for any inquiries regarding real estate, food orders, or our platform.',
};

export default function ContactPage() {
  return (
    <div className="waterlily-surface min-h-screen pt-24 pb-20 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            Get In Touch
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg uppercase tracking-[0.1em] font-bold">
            Have questions? We're here to help you navigate the future of real estate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
              <h2 className="text-xl font-black uppercase tracking-wider text-white mb-8">
                Contact Info
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Email Us</p>
                    <a href="mailto:tahsrz@gmail.com" className="text-white font-bold hover:text-blue-300 transition-colors">
                      tahsrz@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg text-orange-400">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Call Us</p>
                    <p className="text-white font-bold">Contact available via email</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Location</p>
                    <p className="text-white font-bold">101 S Council<br />Sunset, TX</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
              <h3 className="text-white font-black uppercase tracking-widest mb-4">Business Hours</h3>
              <p className="text-slate-300 text-sm leading-relaxed font-bold uppercase tracking-wider">
                Monday - Friday: 9am - 6pm<br />
                Saturday: 10am - 4pm<br />
                Sunday: Closed
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
