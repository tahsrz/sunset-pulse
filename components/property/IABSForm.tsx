'use client';

import React from 'react';
import { useAuth, Profile } from '@/context/AuthContext';
import { FaPrint, FaDownload, FaShieldAlt } from 'react-icons/fa';

/**
 * Extended Profile with Brokerage details for IABS form
 */
interface IABSProfile extends Profile {
  brokerage_name?: string;
  brokerage_license?: string;
  brokerage_email?: string;
  brokerage_phone?: string;
  designated_broker?: string;
  designated_broker_license?: string;
  supervisor?: string;
  supervisor_license?: string;
  license_id?: string;
  phone_number?: string;
}

const IABSForm = () => {
  const { user } = useAuth();
  
  // Type-casting the profile to access brokerage attributes
  const profile = user?.profile as IABSProfile;

  const data = {
    brokerageName: profile?.brokerage_name || 'Sunset Real Estate Group',
    brokerageLicense: profile?.brokerage_license || '9001234',
    brokerageEmail: profile?.brokerage_email || 'info@sunsetpulse.com',
    brokeragePhone: profile?.brokerage_phone || '940-555-0123',
    
    designatedBroker: profile?.designated_broker || 'Tahsin Noyon Reza',
    designatedBrokerLicense: profile?.designated_broker_license || '0654321',
    designatedBrokerEmail: profile?.brokerage_email || 'treza@sunsetpulse.com',
    designatedBrokerPhone: profile?.brokerage_phone || '940-555-0123',

    supervisor: profile?.supervisor || 'Jamie AI Controller',
    supervisorLicense: profile?.supervisor_license || 'N/A',
    supervisorEmail: 'ai-ops@sunsetpulse.com',
    supervisorPhone: '940-555-0999',

    agentName: profile?.full_name || user?.user_metadata?.full_name || 'Sunset Agent',
    agentLicense: profile?.license_id || user?.user_metadata?.license_id || 'Pending',
    agentEmail: user?.email || 'agent@sunsetpulse.com',
    agentPhone: profile?.phone_number || 'Contact via Grid',
  };

  return (
    <div className="bg-white text-black p-8 md:p-12 max-w-4xl mx-auto shadow-2xl rounded-sm font-serif border border-gray-300">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase">Information About Brokerage Services</h1>
          <p className="text-[10px] italic">Texas law requires all real estate license holders to give the following information about brokerage services to prospective buyers, tenants, sellers and landlords.</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <FaPrint />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <FaDownload />
          </button>
        </div>
      </div>

      <div className="space-y-6 text-xs leading-relaxed">
        <section>
          <h2 className="font-bold uppercase mb-2">Types of Real Estate License Holders:</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>A BROKER</strong> is responsible for all brokerage activities, including acts performed by sales agents sponsored by the broker.</li>
            <li><strong>A SALES AGENT</strong> must be sponsored by a broker and works with clients on behalf of the broker.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">A Broker's Minimum Duties Required By Law (A client is the person or party that the broker represents):</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Put the interests of the client above all others, including the broker's own interests;</li>
            <li>Inform the client of any material information about the property or transaction received by the broker;</li>
            <li>Answer the client's questions and present any offer to or counter-offer from the client; and</li>
            <li>Treat all parties to a real estate transaction honestly and fairly.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">A License Holder Can Represent A Party In A Real Estate Transaction:</h2>
          <div className="space-y-4 mt-2">
            <p><strong>AS AGENT FOR OWNER (SELLER/LANDLORD):</strong> The broker becomes the property owner's agent through an agreement with the owner, usually in a written listing to sell or property management agreement. An owner's agent must perform the broker's minimum duties above and must inform the owner of any material information about the property or transaction known by the agent, including information disclosed to the agent or subagent by the buyer or buyer's agent.</p>
            <p><strong>AS AGENT FOR BUYER/TENANT:</strong> The broker becomes the buyer/tenant's agent by agreeing to represent the buyer, usually through a written representation agreement. A buyer's agent must perform the broker's minimum duties above and must inform the buyer of any material information about the property or transaction known by the agent, including information disclosed to the agent by the seller or seller's agent.</p>
            <p><strong>AS AGENT FOR BOTH - INTERMEDIARY:</strong> To act as an intermediary between the parties the broker must first obtain the written agreement of each party to the transaction. The written agreement must state who will pay the broker and, in conspicuous bold or underlined print, set forth the broker's obligations as an intermediary. A broker who acts as an intermediary:</p>
            <ul className="list-disc ml-10 space-y-1">
              <li>Must treat all parties to the transaction impartially and fairly;</li>
              <li>May, with the parties' written consent, appoint a different license holder associated with the broker to each party (owner and buyer) to communicate with, provide opinions and advice to, and carry out the instructions of each party to the transaction.</li>
              <li>Must not, unless specifically authorized in writing to do so by the party, disclose:
                <ul className="list-circle ml-6 mt-1">
                  <li>that the owner will accept a price less than the written asking price;</li>
                  <li>that the buyer/tenant will pay a price greater than the price submitted in a written offer; and</li>
                  <li>any confidential information or any other information that a party specifically instructs the broker in writing not to disclose, unless required to do so by law.</li>
                </ul>
              </li>
            </ul>
            <p><strong>AS SUBAGENT:</strong> A license holder acts as a subagent when aiding a buyer in a transaction without an agreement to represent the buyer. A subagent can assist the buyer but does not represent the buyer and must place the interests of the owner first.</p>
          </div>
        </section>

        <section className="border-t-2 border-black pt-6">
          <h2 className="font-bold uppercase mb-4 underline">Information About Brokerage Services (Mandatory Disclosure)</h2>
          
          <div className="grid grid-cols-4 border border-black text-[10px]">
            <div className="col-span-1 border-b border-r border-black p-2 font-bold">Position</div>
            <div className="col-span-1 border-b border-r border-black p-2 font-bold">License Holder Name</div>
            <div className="col-span-1 border-b border-r border-black p-2 font-bold">Email</div>
            <div className="col-span-1 border-b border-black p-2 font-bold">Phone</div>

            {/* Brokerage */}
            <div className="col-span-1 border-b border-r border-black p-2">Licensed Broker /Broker Firm Name or Primary Assumed Business Name</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.brokerageName} (License: {data.brokerageLicense})</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.brokerageEmail}</div>
            <div className="col-span-1 border-b border-black p-2">{data.brokeragePhone}</div>

            {/* Designated Broker */}
            <div className="col-span-1 border-b border-r border-black p-2">Designated Broker of Firm</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.designatedBroker} (License: {data.designatedBrokerLicense})</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.designatedBrokerEmail}</div>
            <div className="col-span-1 border-b border-black p-2">{data.designatedBrokerPhone}</div>

            {/* Supervisor */}
            <div className="col-span-1 border-b border-r border-black p-2">Licensed Supervisor of Sales Agent/ Associate</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.supervisor} (License: {data.supervisorLicense})</div>
            <div className="col-span-1 border-b border-r border-black p-2">{data.supervisorEmail}</div>
            <div className="col-span-1 border-b border-black p-2">{data.supervisorPhone}</div>

            {/* Agent */}
            <div className="col-span-1 border-r border-black p-2">Sales Agent/ Associate's Name</div>
            <div className="col-span-1 border-r border-black p-2">{data.agentName} (License: {data.agentLicense})</div>
            <div className="col-span-1 border-r border-black p-2">{data.agentEmail}</div>
            <div className="col-span-1 p-2">{data.agentPhone}</div>
          </div>
        </section>

        <div className="mt-8 flex justify-between items-end border-t border-gray-200 pt-4">
          <div className="text-[8px] text-gray-500 uppercase tracking-widest">
            TREC IABS 1-0 // SUNSET PULSE TAH_GRID_SYNCHRONIZED
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold italic">
            <FaShieldAlt />
            <span>Sunset Pulse Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IABSForm;
