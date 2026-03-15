import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineShieldCheck, HiOutlineOfficeBuilding, HiOutlineFingerPrint, HiOutlineClock, HiOutlineChartBar, HiOutlineUsers, HiOutlineSparkles, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

export default function LoginTypeSelection() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const loginTypes = [
    {
      id: 'admin',
      title: 'Admin Portal',
      description: 'Complete administrative control and employee management',
      icon: HiOutlineShieldCheck,
      color: 'from-red-500 via-rose-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-red-50 to-rose-50',
      textColor: 'text-red-600',
      route: '/login?type=admin',
      buttonText: 'Login as Admin',
      features: ['Employee Management', 'Payroll Control', 'Attendance Monitoring'],
    },
    {
      id: 'remote-employee',
      title: 'Remote Work',
      description: 'Attendance system for employees working from home',
      icon: HiOutlineOfficeBuilding,
      color: 'from-blue-500 via-indigo-500 to-purple-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      textColor: 'text-blue-600',
      route: '/login?type=remote-employee',
      buttonText: 'Login for Remote Work',
      features: ['Remote Clock-In/Clock-Out', 'Work Reports', 'Activity Tracking'],
    },
    {
      id: 'onsite-employee',
      title: 'Office Attendance',
      description: 'Biometric attendance for onsite employees',
      icon: HiOutlineFingerPrint,
      color: 'from-green-500 via-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
      textColor: 'text-green-600',
      route: '/login?type=onsite-employee',
      buttonText: 'Login for Office Attendance',
      features: ['Biometric Login', 'Device Sync', 'Office Check-In'],
    },
  ];

  const stats = [
    { icon: HiOutlineUsers, label: 'Active Employees', value: '500+' },
    { icon: HiOutlineClock, label: 'Daily Check-ins', value: '2.1K' },
    { icon: HiOutlineChartBar, label: 'Reports Generated', value: '15K+' },
  ];

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % loginTypes.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + loginTypes.length) % loginTypes.length);
  };

  const goToCard = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-indigo-100/40 relative overflow-hidden">
      {/* Professional Modern Background */}
      <div className="absolute inset-0">
        {/* Primary geometric shapes with more depth */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-purple-400/12 to-pink-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-500/6 rounded-full blur-2xl"></div>

        {/* Additional layered shapes for depth */}
        <div className="absolute top-32 right-32 w-48 h-48 bg-gradient-to-br from-emerald-400/8 to-teal-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-32 w-56 h-56 bg-gradient-to-br from-rose-400/6 to-orange-500/4 rounded-full blur-2xl"></div>
      </div>

      {/* Enhanced grid pattern with more visibility */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px),
          radial-gradient(circle at 25% 25%, rgba(99,102,241,0.3) 2px, transparent 2px),
          radial-gradient(circle at 75% 75%, rgba(168,85,247,0.2) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 60px 60px, 120px 120px, 80px 80px'
      }}></div>

      {/* More prominent accent lines */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-px h-40 bg-gradient-to-b from-blue-300/70 via-blue-200/50 to-transparent"></div>
        <div className="absolute top-0 right-1/3 w-px h-32 bg-gradient-to-b from-purple-300/70 via-purple-200/50 to-transparent"></div>
        <div className="absolute bottom-0 left-1/3 w-px h-48 bg-gradient-to-t from-indigo-300/70 via-indigo-200/50 to-transparent"></div>
        <div className="absolute bottom-0 right-1/4 w-px h-36 bg-gradient-to-t from-cyan-300/70 via-cyan-200/50 to-transparent"></div>

        {/* Additional accent elements */}
        <div className="absolute top-1/4 right-1/5 w-px h-24 bg-gradient-to-b from-emerald-300/60 to-transparent"></div>
        <div className="absolute bottom-1/4 left-1/5 w-px h-28 bg-gradient-to-t from-rose-300/60 to-transparent"></div>
      </div>

      {/* Enhanced floating geometric elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 right-16 w-4 h-4 bg-blue-400/40 rotate-45 shadow-lg shadow-blue-400/30"></div>
        <div className="absolute top-32 left-20 w-3 h-3 bg-purple-400/35 rounded-full shadow-md shadow-purple-400/25"></div>
        <div className="absolute bottom-24 right-32 w-5 h-5 bg-indigo-400/30 rotate-12 shadow-lg shadow-indigo-400/25"></div>
        <div className="absolute bottom-16 left-16 w-3.5 h-3.5 bg-cyan-400/40 rounded-lg shadow-md shadow-cyan-400/30"></div>
        <div className="absolute top-1/2 right-8 w-2 h-2 bg-pink-400/45 rounded-full shadow-sm shadow-pink-400/35"></div>
        <div className="absolute top-3/4 left-1/4 w-2.5 h-2.5 bg-emerald-400/35 rotate-45 shadow-md shadow-emerald-400/25"></div>
        <div className="absolute bottom-1/3 right-1/6 w-3 h-3 bg-orange-400/30 rounded-full shadow-md shadow-orange-400/20"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-3 py-6">
        <div className="w-full max-w-5xl">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-3"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-200/50">
                  <HiOutlineSparkles className="h-3 w-3" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent mb-0.5">
                  Brainiax AMS
                </h1>
                <p className="text-xs text-gray-600 font-medium">Advanced Attendance Management System</p>
              </div>
            </div>

            <div className="max-w-lg mx-auto">
              <h2 className="text-sm md:text-base font-bold text-gray-900 mb-1">
                Choose Your Access Portal
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Select your role to continue managing attendance efficiently and securely
              </p>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-white/90 backdrop-blur-xl rounded-lg p-3 shadow-lg shadow-blue-100/50 border border-white/60 hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Carousel Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Navigation Arrows */}
            <button
              onClick={prevCard}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-white/60 flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300"
            >
              <HiOutlineChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={nextCard}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-white/60 flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300"
            >
              <HiOutlineChevronRight className="w-6 h-6 text-gray-700" />
            </button>

            {/* Cards Container */}
            <div className="relative h-52 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {loginTypes.map((type, index) => {
                  const isActive = index === currentIndex;
                  const isPrev = index === (currentIndex - 1 + loginTypes.length) % loginTypes.length;
                  const isNext = index === (currentIndex + 1) % loginTypes.length;

                  return (
                    <motion.div
                      key={`${type.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                      animate={{
                        opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0.2,
                        scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                        rotateY: isActive ? 0 : isPrev ? -15 : isNext ? 15 : index < currentIndex ? -30 : 30,
                        x: isActive ? 0 : isPrev ? -200 : isNext ? 200 : index < currentIndex ? -400 : 400,
                        zIndex: isActive ? 10 : isPrev || isNext ? 5 : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.5
                      }}
                      className={`absolute w-64 h-48 cursor-pointer ${
                        isActive ? 'pointer-events-auto' : 'pointer-events-none'
                      }`}
                      onClick={() => isActive && navigate(type.route)}
                    >
                      <div className={`w-full h-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 transition-all duration-500 ${
                        isActive
                          ? `border-${type.color.split('-')[1]}-400 shadow-${type.color.split('-')[1]}-300/60 bg-white/98`
                          : 'border-gray-200/80 shadow-gray-300/40 bg-white/85'
                      }`}>
                        {/* Card Glow Effect */}
                        {isActive && (
                          <div className={`absolute inset-0 rounded-2xl opacity-30 blur-xl bg-gradient-to-br ${type.color}`}></div>
                        )}

                        <div className="relative h-full flex flex-col items-center justify-center p-5 text-center">
                          {/* Icon */}
                          <motion.div
                            animate={{ scale: isActive ? 1.1 : 1 }}
                            transition={{ duration: 0.3 }}
                            className={`w-12 h-12 rounded-lg ${type.bgColor} ${type.textColor} flex items-center justify-center mb-3 shadow-lg`}
                          >
                            <type.icon className="w-6 h-6" />
                          </motion.div>

                          {/* Title */}
                          <h3 className={`text-base font-bold mb-2 transition-colors duration-300 ${
                            isActive ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {type.title}
                          </h3>

                          {/* Description */}
                          <p className={`text-xs leading-relaxed mb-3 transition-colors duration-300 ${
                            isActive ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {type.description}
                          </p>

                          {/* Features */}
                          <div className="mb-3">
                            <ul className="space-y-1">
                              {type.features.slice(0, 2).map((feature, idx) => (
                                <li key={idx} className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
                                  isActive ? 'text-gray-700' : 'text-gray-400'
                                }`}>
                                  <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                                    isActive ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}></div>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Action Button */}
                          {isActive && (
                            <motion.button
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className={`px-4 py-2 text-sm bg-gradient-to-r ${type.color} text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white/20`}
                            >
                              {type.buttonText}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-3 mt-6">
              {loginTypes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToCard(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-blue-600 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/30 shadow-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600 font-medium">
                System Status: <span className="text-green-600">All Systems Operational</span>
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              &copy; {new Date().getFullYear()} Brainiax Technologies. Secure & Reliable Attendance Management.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}