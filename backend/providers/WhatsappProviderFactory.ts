import { IWhatsappProvider } from './interfaces/IWhatsappProvider';
import { ZapiProvider } from './ZapiProvider';
import { EvolutionProvider } from './EvolutionProvider';
import { MetaCloudProvider } from './MetaCloudProvider';

/**
 * Factory Pattern: Creates the appropriate WhatsApp provider instance
 * based on the provider name
 */
export class WhatsappProviderFactory {
    /**
     * Create a provider instance
     * @param providerName - Name of the provider ('zapi', 'evolution', 'meta')
     * @returns Instance of the requested provider
     * @throws Error if provider is unknown
     */
    static createProvider(providerName: string): IWhatsappProvider {
        const normalizedProvider = providerName.toLowerCase().trim();

        switch (normalizedProvider) {
            case 'zapi':
            case 'z-api':
                return new ZapiProvider();

            case 'evolution':
            case 'evolution-api':
                return new EvolutionProvider();

            case 'meta':
            case 'meta-cloud':
            case 'whatsapp-cloud':
                return new MetaCloudProvider();

            default:
                throw new Error(
                    `Unknown WhatsApp provider: ${providerName}. Supported providers: zapi, evolution, meta`
                );
        }
    }

    /**
     * Get list of supported providers
     */
    static getSupportedProviders(): string[] {
        return ['zapi', 'evolution', 'meta'];
    }

    /**
     * Check if a provider is supported
     */
    static isProviderSupported(providerName: string): boolean {
        const normalized = providerName.toLowerCase().trim();
        return ['zapi', 'z-api', 'evolution', 'evolution-api', 'meta', 'meta-cloud', 'whatsapp-cloud'].includes(normalized);
    }
}
