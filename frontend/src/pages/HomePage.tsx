import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Users, ChevronRight, Heart, AlertTriangle, Pill, Apple, Search, Activity } from 'lucide-react';

export const HomePage: React.FC = () => {
  const featureBoxes = [
    {
      icon: Search,
      title: 'Check Medications',
      description: 'Comprehensive drug interaction analysis with patient information',
      href: '/check-medications',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: AlertTriangle,
      title: 'Side Effects',
      description: 'Get detailed information about medication side effects',
      href: '/side-effects',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Pill,
      title: 'Drug Information',
      description: 'Learn about medications and their uses',
      href: '/drug-info',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: Apple,
      title: 'Food Interactions',
      description: 'Discover food interactions with your medications',
      href: '/food-interactions',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Advanced Medication
                  <span className="block text-teal-300">Safety Platform</span>
                </h1>
                <p className="text-xl text-blue-100 max-w-2xl">
                  Comprehensive drug interaction checking powered by AI and FDA-approved databases. 
                  Ensure patient safety with real-time analysis and personalized recommendations.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/check-medications"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Check Medications</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
               
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <img 
                  src="https://www.banyantreatmentcenter.com/wp-content/uploads/2020/11/blog-3.jpg"
                  alt="Medical Professional"
                  className="w-full h-80 object-cover rounded-xl"
                />
                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Activity className="h-6 w-6 text-teal-300" />
                    <span className="text-lg font-semibold">Trusted Healthcare Platform</span>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Empowering healthcare professionals with advanced medication safety tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* Feature Boxes Section */}
      <div className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Explore Our Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Click on any feature below to access comprehensive medication safety tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureBoxes.map((feature, index) => (
              <Link
                key={index}
                to={feature.href}
                className="group bg-white dark:bg-gray-700 rounded-2xl p-8 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-600 block"
              >
                <div className={`bg-gradient-to-r ${feature.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  <span>Explore</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      

     
      </div>
  );
};