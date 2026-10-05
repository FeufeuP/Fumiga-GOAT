# Chave de assinatura Android

Esta pasta deve conter somente `fumiga-release-public.pem`, o certificado **público** da chave de
release. Ele não permite assinar APKs e é seguro versioná-lo. O APK assinado inclui esse
certificado e a assinatura no próprio formato APK. O certificado aqui presente foi gerado antes
de a chave privada ser guardada em Actions secrets; **não fixe nem use este fingerprint para
validar uma Release**. Depois de estabelecer a chave privada estável, rode
`bash tools/export-android-public-cert.sh` para atualizar o certificado.

**A chave privada não fica no APK nem no repositório.** Ela deve permanecer em um Actions secret
(`FUMIGA_KEYSTORE_BASE64` e variáveis associadas) e em backup privado, fora do Git. Qualquer pessoa
com a chave privada poderia distribuir um APK que o Android aceitaria como atualização oficial.

Fingerprint SHA-256 do certificado público:

```text
E9:33:98:FE:A4:AE:75:82:07:4A:DA:5F:1A:07:2E:5F:82:5F:42:1D:A8:56:84:71:27:24:13:50:C5:49:CE:88
```
