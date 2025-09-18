// Componente visual decorativo para fundo da página de músicas
import React from 'react';

const FeaturesPlanet: React.FC = () => (
	<div className="absolute inset-0 pointer-events-none z-0">
		{/* Exemplo de fundo decorativo, pode ser substituído por SVG/Canvas animado */}
		<div className="w-full h-full flex items-center justify-center">
			<div className="w-96 h-96 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full blur-3xl opacity-40 animate-pulse" />
		</div>
	</div>
);

export default FeaturesPlanet;
