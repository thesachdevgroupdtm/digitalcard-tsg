import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { Employee, Link, Resource, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Download, 
  Share2, 
  QrCode, 
  ChevronRight, 
  FileText, 
  Video, 
  Send,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Github,
  Youtube,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  User,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import VCard from 'vcf';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Lazy load sections for performance
const ProductSection = lazy(() => Promise.resolve({ default: ({ products }: { products: Product[] }) => (
  <div className="mt-12">
    <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Products & Services</h3>
    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
      {products.map(product => (
        <motion.div 
          whileHover={{ y: -5 }}
          key={product.id} 
          className="min-w-[280px] bg-neutral-900/50 backdrop-blur rounded-[2rem] overflow-hidden border border-white/5 snap-center"
        >
          <div className="aspect-[4/3] bg-neutral-800">
            {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />}
          </div>
          <div className="p-6">
            <h4 className="font-bold text-lg mb-2">{product.name}</h4>
            <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2">{product.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
) }));

const DigitalCard = () => {
  const { slug } = useParams<{ slug: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        console.log('Fetching card for slug:', slug);
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (empError) {
          console.error('Fetch Card Error:', empError);
          setLoading(false);
          return;
        }

        if (empData) {
          console.log('Employee data found:', empData);
          setEmployee(empData as Employee);

          // Track view
          await supabase.from('analytics').insert([{
            employee_id: empData.id,
            event_type: 'view',
            created_at: new Date().toISOString()
          }]);

          // Fetch related data
          const [linksRes, resourcesRes, productsRes] = await Promise.all([
            supabase.from('links').select('*').eq('employee_id', empData.id),
            supabase.from('resources').select('*').eq('employee_id', empData.id),
            supabase.from('products').select('*').eq('employee_id', empData.id)
          ]);

          if (linksRes.data) setLinks(linksRes.data as Link[]);
          if (resourcesRes.data) setResources(resourcesRes.data as Resource[]);
          if (productsRes.data) setProducts(productsRes.data as Product[]);

          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading card:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const trackClick = async (type: string) => {
    if (!employee) return;
    try {
      await supabase.from('analytics').insert([{
        employee_id: employee.id,
        event_type: 'click',
        created_at: new Date().toISOString(),
        metadata: { button: type }
      }]);
    } catch (err) {
      console.error("Tracking error:", err);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const { error } = await supabase.from('leads').insert([{
        employee_id: employee.id,
        ...leadForm,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setSubmitted(true);
      setLeadForm({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
    }
  };

  const downloadVCard = () => {
    if (!employee) return;
    trackClick('vcard');
    const card = new VCard();
    card.set('fn', employee.name);
    card.set('n', `${employee.name.split(' ').reverse().join(';')};;;;`);
    card.set('title', employee.designation);
    card.set('tel', employee.phone, { type: 'cell' });
    card.set('email', employee.email, { type: 'work' });
    card.set('org', 'Galaxy Toyota');
    card.set('url', window.location.href);
    card.set('note', employee.about);
    
    const blob = new Blob([card.toString()], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employee.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
  };

  const shareCard = async () => {
    if (!employee) return;
    trackClick('share');
    const shareData = {
      title: `${employee.name} | Galaxy Toyota`,
      text: `Connect with ${employee.name} from Galaxy Toyota. View digital business card here:`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!employee) return;
    trackClick('whatsapp_share');
    const text = encodeURIComponent(`*${employee.name}* - ${employee.designation}\nGalaxy Toyota\n\nView my digital business card:\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-neutral-500 text-sm font-medium animate-pulse">Loading Premium Experience...</p>
    </div>
  );

  if (!employee || employee.status === 'inactive') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6 text-center">
      <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
        <X size={40} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{employee?.status === 'inactive' ? 'Card Inactive' : 'Card Not Found'}</h1>
      <p className="text-neutral-500 text-sm mb-8">
        {employee?.status === 'inactive' 
          ? 'This digital business card has been temporarily deactivated.' 
          : 'The digital card you are looking for doesn\'t exist or has been moved.'}
      </p>
      <a href="/" className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm">Go Home</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-blue-600 selection:text-white">
      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <motion.a 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          href={`tel:${employee.phone}`}
          onClick={() => trackClick('fab_call')}
          className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/20 border border-white/10"
        >
          <Phone size={24} />
        </motion.a>
        <motion.a 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          href={`https://wa.me/${employee.phone.replace(/\D/g,'')}`}
          onClick={() => trackClick('fab_whatsapp')}
          className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/20 border border-white/10"
        >
          <MessageSquare size={24} />
        </motion.a>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
        <div className="bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex gap-2 shadow-2xl">
          <button 
            onClick={downloadVCard}
            className="flex-1 bg-white text-black py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Save Contact
          </button>
          <button 
            onClick={shareCard}
            className="w-14 h-14 bg-neutral-800 rounded-2xl flex items-center justify-center border border-white/5"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[45vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/30 via-neutral-950/60 to-neutral-950 z-10" />
        {employee.photo ? (
          <motion.img 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src={employee.photo} 
            alt={employee.name} 
            className="w-full h-full object-cover blur-md" 
          />
        ) : (
          <div className="w-full h-full bg-neutral-900" />
        )}
      </div>

      <div className="max-w-md mx-auto px-6 -mt-40 relative z-20 pb-32">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="relative inline-block mb-8">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-36 h-36 rounded-[2.5rem] bg-neutral-800 overflow-hidden border-4 border-neutral-900 shadow-2xl mx-auto"
            >
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-700">
                  <User size={72} />
                </div>
              )}
            </motion.div>
            <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2.5 rounded-2xl shadow-xl border-4 border-neutral-900">
              <CheckCircle2 size={20} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2">{employee.name}</h1>
          <p className="text-blue-500 font-bold text-xs uppercase tracking-[0.4em] mb-6">{employee.designation}</p>
          
          <div className="bg-white/5 rounded-2xl p-4 mb-8">
            <p className="text-neutral-400 text-sm leading-relaxed italic">"{employee.about || 'Welcome to my digital business card.'}"</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ActionButton icon={<Phone />} label="Call" href={`tel:${employee.phone}`} onClick={() => trackClick('call')} />
            <ActionButton icon={<Mail />} label="Email" href={`mailto:${employee.email}`} onClick={() => trackClick('email')} />
            <ActionButton icon={<MessageSquare />} label="WhatsApp" href={`https://wa.me/${employee.phone.replace(/\D/g,'')}`} onClick={() => trackClick('whatsapp')} />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="mt-8 space-y-3">
          <button 
            onClick={downloadVCard}
            className="w-full flex items-center justify-between bg-white text-black p-5 rounded-3xl font-bold text-sm group hover:bg-neutral-100 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                <Download size={20} />
              </div>
              Save to Contacts
            </div>
            <ArrowRight size={18} className="text-black/20 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={shareCard}
              className="flex items-center justify-center gap-3 bg-neutral-900 border border-white/5 p-5 rounded-3xl font-bold text-sm hover:bg-neutral-800 transition-all"
            >
              <Share2 size={18} className="text-blue-500" />
              Share
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-3 bg-neutral-900 border border-white/5 p-5 rounded-3xl font-bold text-sm hover:bg-neutral-800 transition-all"
            >
              {copySuccess ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} className="text-neutral-400" />}
              {copySuccess ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Social Links */}
        {links.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Digital Presence</h3>
            <div className="grid grid-cols-4 gap-4">
              {links.map(link => (
                <motion.a 
                  whileHover={{ y: -5, scale: 1.05 }}
                  key={link.id} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`social_${link.type}`)}
                  className="aspect-square bg-neutral-900/50 backdrop-blur rounded-[1.5rem] flex items-center justify-center border border-white/5 hover:bg-neutral-800 hover:border-white/10 transition-all"
                >
                  {getLinkIcon(link.type)}
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <Suspense fallback={<div className="h-40 bg-neutral-900 animate-pulse rounded-3xl mt-12" />}>
            <ProductSection products={products} />
          </Suspense>
        )}

        {/* Resources Section */}
        {resources.length > 0 && (
          <div className="mt-12">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-6 px-2">Documents & Media</h3>
            <div className="space-y-3">
              {resources.map(res => (
                <motion.a 
                  whileHover={{ x: 5 }}
                  key={res.id} 
                  href={res.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackClick(`resource_${res.type}`)}
                  className="flex items-center justify-between p-6 bg-neutral-900/50 backdrop-blur rounded-[2rem] border border-white/5 hover:bg-neutral-800 transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      res.type === 'pdf' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {res.type === 'pdf' ? <FileText size={24} /> : <Video size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">{res.title}</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{res.type}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-700 group-hover:text-white transition-all" />
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Inquiry Form */}
        <div className="mt-12 bg-neutral-900/50 backdrop-blur rounded-[3rem] p-10 border border-white/5">
          <h3 className="text-2xl font-bold mb-2">Get in Touch</h3>
          <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Have a question? Send me a message and I'll respond shortly.</p>
          
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-blue-500/20 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="font-bold text-xl mb-2">Message Sent!</h4>
                <p className="text-neutral-500 text-sm">Thank you for reaching out. I'll be in touch soon.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-8 text-blue-500 text-sm font-bold uppercase tracking-widest"
                >
                  Send Another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="space-y-4">
                  <FormInput 
                    required
                    placeholder="Your Name" 
                    value={leadForm.name}
                    onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  />
                  <div className="grid grid-cols-1 gap-4">
                    <FormInput 
                      required
                      placeholder="Phone Number" 
                      value={leadForm.phone}
                      onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    />
                    <FormInput 
                      required
                      type="email"
                      placeholder="Email Address" 
                      value={leadForm.email}
                      onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    />
                  </div>
                  <textarea 
                    required
                    placeholder="How can I help you?" 
                    value={leadForm.message}
                    onChange={e => setLeadForm({...leadForm, message: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-blue-500 focus:bg-white/10 transition-all min-h-[140px] resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20"
                >
                  <Send size={18} />
                  Send Message
                </button>
              </form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-8" />
          <p className="text-neutral-600 text-[10px] uppercase tracking-[0.5em] mb-4">Official Digital Card of</p>
          <h2 className="text-2xl font-black text-white/20 tracking-tighter italic">GALAXY TOYOTA</h2>
          <p className="text-neutral-700 text-[10px] mt-8">© 2026 All Rights Reserved</p>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-neutral-950/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-12 max-w-sm w-full relative text-center shadow-2xl"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-8 right-8 p-2 text-neutral-300 hover:text-neutral-900 transition-all"
              >
                <X size={28} />
              </button>
              <h3 className="text-neutral-900 text-2xl font-black mb-2">Scan Me</h3>
              <p className="text-neutral-500 text-sm mb-10">Point your camera to instantly view my digital card.</p>
              
              <div className="bg-neutral-50 p-8 rounded-[2.5rem] inline-block mb-10 shadow-inner border border-neutral-100">
                <QRCodeSVG 
                  value={window.location.href} 
                  size={200} 
                  includeMargin={false}
                  level="H"
                />
              </div>
              
              <div className="space-y-1">
                <p className="text-neutral-900 font-bold text-lg">{employee.name}</p>
                <p className="text-neutral-400 text-xs uppercase tracking-widest">{employee.designation}</p>
              </div>

              <button 
                onClick={shareToWhatsApp}
                className="mt-10 w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3"
              >
                <MessageSquare size={18} />
                Share on WhatsApp
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionButton = ({ icon, label, href, onClick }: { icon: React.ReactNode, label: string, href: string, onClick: () => void }) => (
  <motion.a 
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.95 }}
    href={href}
    onClick={onClick}
    className="flex flex-col items-center gap-3 group"
  >
    <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/5 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all shadow-lg">
      <div className="text-neutral-400 group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
      </div>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">{label}</span>
  </motion.a>
);

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
  />
);

const getLinkIcon = (type: string) => {
  const size = 28;
  switch(type) {
    case 'instagram': return <Instagram size={size} className="text-white" />;
    case 'linkedin': return <Linkedin size={size} className="text-white" />;
    case 'twitter': return <Twitter size={size} className="text-white" />;
    case 'facebook': return <Facebook size={size} className="text-white" />;
    case 'github': return <Github size={size} className="text-white" />;
    case 'youtube': return <Youtube size={size} className="text-white" />;
    default: return <Globe size={size} className="text-white" />;
  }
};

export default DigitalCard;
