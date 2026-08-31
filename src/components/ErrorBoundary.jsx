import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [CRITICAL] React ErrorBoundary caught an unhandled component error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#070204] text-white flex flex-col items-center justify-center p-6 text-center font-rajdhani select-none">
          <div className="w-16 h-16 rounded-full bg-[#ff1f43]/20 border-2 border-[#ff1f43] flex items-center justify-center mb-4 shadow-[0_0_30px_#ff1f43] animate-pulse">
            <span className="font-orbitron font-black text-2xl text-[#ff1f43]">⚡</span>
          </div>

          <h1 className="font-orbitron font-black text-xl sm:text-2xl text-white tracking-widest uppercase text-glow-red">
            REACTOR SYSTEM RECOVERY
          </h1>

          <p className="text-xs sm:text-sm text-[#ffccd5] max-w-sm mt-2 mb-6 leading-relaxed">
            The launch interface encountered a momentary visual glitch and prevented a system crash.
          </p>

          <button
            onClick={this.handleReload}
            className="py-3.5 px-6 sci-fi-cut font-orbitron font-black text-sm tracking-widest uppercase bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] active:scale-95 text-white shadow-neon-red border-2 border-white/80 cursor-pointer transition-all"
          >
            RESTORE INTERFACE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
